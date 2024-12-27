import express from 'express';
import {promises as fs} from 'fs'
import {parseStringPromise } from 'xml2js';

const app = express();
const PORT = 4000; 

app.get('/xml', async (req, res) => {
  try {
    const filePath = 'C:/Users/SureshS/OneDrive - Meyi Cloud Solutions Private Limited/workspace/createAPI/Tomtom/scarping/src/niagara_scarping/fire-alert.xml';
    const xmlData = await fs.readFile(filePath, 'utf-8');
    res.header('Content-Type', 'application/xml');
    res.send(xmlData);
  } catch (error) {
    console.error('Error processing the XML file:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
