const PromptVault = require('../models/PromptVault');
const { decryptPrompt } = require('../utils/serverCrypto');
const { embedText, generateContent } = require('../utils/geminiClient');
const cosineSimilarity = require('../utils/cosineSimilarity');
const logAction = require('../utils/logAction');

const TOP_K = 3; // how many past prompts to retrieve as context

/**
 * POST /api/ai/query
 * Body: { query, masterSecret }
 *
 * Flow:
 *  1. Fetch this team's encrypted prompts from MongoDB (ciphertext only)
 *  2. Decrypt each one IN MEMORY using the master secret sent for this
 *     request - never stored, never logged
 *  3. Embed each decrypted prompt + the user's query
 *  4. Rank by cosine similarity, take the top K most relevant past prompts
 *  5. Build an augmented prompt (query + retrieved context) and send to Gemini
 *  6. Return the answer - decrypted text and embeddings are discarded when
 *     this function returns; nothing touches the database
 */
const queryVault = async (req, res) => {
  const { query, masterSecret } = req.body;

  if (!query || !masterSecret) {
    return res.status(400).json({ message: 'query and masterSecret are required' });
  }

  try {
    const encryptedPrompts = await PromptVault.find({ teamId: req.user.teamId }).limit(100);

    if (encryptedPrompts.length === 0) {
      // No stored prompts at all - don't fall back to a generic, ungrounded
      // AI answer. This tool is explicitly "answer from your vault", not a
      // general chatbot, so say that plainly instead.
      return res.status(200).json({
        answer:
          "Your vault doesn't have any saved prompts yet, so there's no context to answer from. Save a prompt first, then ask again.",
        usedContext: [],
      });
    }

    // Decrypt everything in memory. A single corrupted/incompatible entry
    // shouldn't take down retrieval for every other valid prompt - skip
    // bad ones individually and only fail outright if NOTHING decrypts
    // (which usually means the master secret itself is wrong).
    const decryptedPrompts = [];
    for (const p of encryptedPrompts) {
      try {
        decryptedPrompts.push({
          id: p._id,
          title: p.title,
          text: decryptPrompt(p, masterSecret),
        });
      } catch (err) {
        console.warn(`Skipping prompt ${p._id} - failed to decrypt:`, err.message);
      }
    }

    if (decryptedPrompts.length === 0) {
      return res.status(401).json({ message: 'Incorrect master secret - could not decrypt vault' });
    }

    // Embed the query and every decrypted prompt
    const queryEmbedding = await embedText(query);
    const scored = await Promise.all(
      decryptedPrompts.map(async (p) => ({
        ...p,
        score: cosineSimilarity(queryEmbedding, await embedText(p.text)),
      }))
    );

    // Take the most relevant prompts as retrieved context
    const topMatches = scored.sort((a, b) => b.score - a.score).slice(0, TOP_K);

    const contextBlock = topMatches
      .map((m, i) => `[Context ${i + 1} - "${m.title}"]\n${m.text}`)
      .join('\n\n');

    const augmentedPrompt = `You are answering strictly from a developer's private, encrypted prompt vault. You are NOT a general-purpose assistant for this request.

${contextBlock}

User's question:
${query}

Rules:
- Answer using ONLY the context above.
- If the context doesn't contain enough information to answer, say exactly that: the vault doesn't have relevant saved prompts for this question. Do not fill the gap with your own general knowledge.
- Do not add disclaimers about being an AI - just answer from the context, or say it isn't there.`;

    const answer = await generateContent(augmentedPrompt);

    await logAction({
      userId: req.user.userId,
      teamId: req.user.teamId,
      action: 'AI_QUERY',
      ip: req.ip,
    });

    return res.status(200).json({
      answer,
      usedContext: topMatches.map((m) => ({ id: m.id, title: m.title, score: m.score })),
    });
  } catch (err) {
    console.error('AI query error:', err.message);
    return res.status(500).json({
      message: 'AI query failed',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    });
  }
  // Note: decryptedPrompts, queryEmbedding, and masterSecret all go out of
  // scope here and are garbage collected - nothing persists beyond this call.
};

module.exports = { queryVault };
