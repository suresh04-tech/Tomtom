import fs from "fs"
import xml2js from 'xml2js';


const parser = new xml2js.Parser();
const XmlFilepath='C:/Users/SureshS/OneDrive - Meyi Cloud Solutions Private Limited/workspace/createAPI/Tomtom/scarping/fire-alert.xml'

fs.readFile(XmlFilepath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the XML file:', err);
    return;
  }

  parser.parseString(data, (err, result) => {
    if (err) {
      console.error('Error parsing XML to JSON:', err);
      return;
    }


    fs.writeFile('output.json', JSON.stringify(result, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON to file:', err);
      } else {
        console.log('XML has been converted to JSON and saved as output.json');
      }
    });
  });
});
