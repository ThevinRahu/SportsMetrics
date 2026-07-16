/**
 * Content Chunker - splits cleaned HTML into processable chunks
 * without destroying div-based stat blocks.
 * 
 * Fix: The old truncateContent() only kept <table> content, silently
 * deleting div-based stats (gainline, ruck speed, territory %) that
 * rugbypass renders as stacked divs, not tables.
 */

/**
 * Clean HTML of non-content elements but preserve ALL stat-bearing elements
 */
export function cleanContent(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(/<(header|aside)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split content into chunks on natural section boundaries
 * Preserves complete stat blocks within each chunk
 */
export function chunkContent(cleaned, chunkSize = 5000) {
  // Try splitting on heading boundaries first
  const sections = cleaned.split(/(?=<h[23][^>]*>)/i);
  const chunks = [];
  let current = '';

  for (const section of sections) {
    if ((current + section).length > chunkSize && current.length > 0) {
      chunks.push(current);
      current = '';
    }
    current += section;
  }
  if (current.length > 0) {
    chunks.push(current);
  }

  // If no good splits found, do a simple size-based split
  if (chunks.length === 0 && cleaned.length > 0) {
    for (let i = 0; i < cleaned.length; i += chunkSize) {
      chunks.push(cleaned.slice(i, i + chunkSize));
    }
  }

  return chunks;
}

/**
 * Extract the most relevant chunk for match stats
 * Looks for the section containing stat keywords
 */
export function findStatsChunk(chunks) {
  const STAT_KEYWORDS = ['Tackles Made', 'Carries', 'Line Breaks', 'Scrums', 'Lineout', 'Penalties', 'Territory', 'Possession'];
  
  let bestChunk = '';
  let bestScore = 0;

  for (const chunk of chunks) {
    const score = STAT_KEYWORDS.filter(kw => chunk.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  }

  return bestChunk || chunks[0] || '';
}

export default { cleanContent, chunkContent, findStatsChunk };
