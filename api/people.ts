import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src', 'data', 'people.json');

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const data = fs.readFileSync(DATA_PATH, 'utf-8');
      res.status(200).json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: 'Erro ao ler arquivo.' });
    }
  } else if (req.method === 'POST') {
    try {
      const newData = req.body;
      fs.writeFileSync(DATA_PATH, JSON.stringify(newData, null, 2), 'utf-8');
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar arquivo.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido.' });
  }
}
