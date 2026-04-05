import { FastifyInstance } from 'fastify';
import axios from 'axios';

export async function listingPreviewRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { url: string } }>('/api/listing-preview', async (req, reply) => {
    const { url } = req.query;
    if (!url || !url.includes('etsy.com/listing')) {
      return reply.status(400).send({ error: 'Invalid URL' });
    }
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
        timeout: 8000,
      });
      const html: string = res.data;

      const get = (prop: string) => {
        const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
               || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
        return m ? m[1].replace(/&amp;/g,'&').replace(/&#039;/g,"'").replace(/&quot;/g,'"') : null;
      };

      // Extract price from page
      const priceMatch = html.match(/"price":"([^"]+)"/) || html.match(/class="[^"]*price[^"]*"[^>]*>\s*US\$([0-9,.]+)/);
      const price = priceMatch ? priceMatch[1] : null;

      // Extract listing ID from URL
      const idMatch = url.match(/listing\/(\d+)/);
      const listingId = idMatch ? idMatch[1] : null;

      return {
        title: get('title'),
        image: get('image'),
        description: get('description'),
        price,
        listingId,
        url,
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
