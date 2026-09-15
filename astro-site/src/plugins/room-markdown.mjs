import { satteri } from '@astrojs/markdown-satteri';
import { normalizeRoomData, resolveRoomValueTokens } from '../lib/room-values.mjs';

/** Keep Astro's existing Markdown engine; resolve numeric room references before rendering. */
export function roomMarkdownProcessor() {
  const base = satteri();
  return {
    ...base,
    name: 'room-values-satteri',
    async createRenderer(options) {
      const renderer = await base.createRenderer(options);
      return {
        async render(content, renderOptions) {
          const frontmatter = renderOptions?.frontmatter;
          if (!frontmatter || !['campsite', 'cabin', 'suite'].includes(frontmatter.category)) {
            return renderer.render(content, renderOptions);
          }
          const values = normalizeRoomData(frontmatter);
          return renderer.render(resolveRoomValueTokens(content, values), {
            ...renderOptions,
            frontmatter: values,
          });
        },
      };
    },
  };
}
