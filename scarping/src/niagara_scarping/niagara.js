
import { readFile } from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import getuuid from 'uuid-by-string';
import dotenv from "dotenv";

dotenv.config()
const GOOGLE_API_KEY=process.env.GOOGLE_API_KEY;
console.log(GOOGLE_API_KEY)

//Abbreviation
const cleanAddress = (address) => {
  const replacements = {
    'ST': 'STREET',
    'AVE': 'AVENUE',
    'RD': 'ROAD',
    'BLVD': 'BOULEVARD',
    'LN': 'LANE',
    'CT': 'COURT',
    'CIR': 'CIRCLE',
    'PL': 'PLACE',
    'SQ': 'SQUARE',
    'DR': 'DRIVE',
    'PKWY': 'PARKWAY',
    'TT': 'TORONTO'
  };
 
  return Object.entries(replacements).reduce(
    (acc, [abbr, full]) => acc.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full),
    address
  ).trim();
};
 
const lookupAddress = async(roadNames) => {

  const cleanedStreet = cleanAddress(roadNames); 

  const searchQuery = `${cleanedStreet}, Niagara Falls, Ontario, Canada`;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&components=country:CA|administrative_area:ON|locality:Niagara%20Falls`;

   console.log(url); 

    try {
      const response = await fetch(url);
      const data = await response.json();
 
      if (data.status === 'OK' && data.results.length > 0) {
        const { location } = data.results[0].geometry;
        return {
          lat: location.lat,
          long: location.lng,
          formattedAddress: data.results[0].formatted_address
        };
      }
    } catch (error) {
      console.error(`Error looking up address for query "${query}":`, error);
    }
 
  throw new Error('Failed to find location after multiple attempts');
};

//converting xml to json
async function parseXmlFileToJson(filePath) {
  try {
    const data = await readFile(filePath, 'utf-8'); 

    const result = await parseStringPromise(data);
    
    return result;
  } catch (err) {
    console.error('Error reading the XML file:', err);
  }
}

async function main() {
    const filePath = 'C:/Users/SureshS/OneDrive - Meyi Cloud Solutions Private Limited/workspace/createAPI/Tomtom/scarping/src/niagara_scarping/fire-alert.xml'; 
    try{
    const conversionfile = await parseXmlFileToJson(filePath);

    await processAlert(conversionfile);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
main();

const getEventTitle =async (input)=>{
  console.log("geteventtitile",input)
const feed = input.feed || {};
  const entries = feed.entry || [];

  if (entries.length === 0) {
    console.log("No entries found in the XML feed.");
    return;
  }


  for (const entry of entries) {
    const titleField = entry.title && entry.title[0] ? entry.title[0]._ : null;

    if (titleField) {
      const match = titleField.match(/Active Fire Call at (.+)/);
      if (match && match[1]) {
        return  match[1].trim();
      } else {
        console.log("No road names found in title:", titleField);
      }
    } else {
      console.log("Title field is missing or malformed in entry:", entry);
    }
  }
}


const processAlert = async (input) => {
  if (!input || !input.feed) {
    console.error("Invalid input or missing feed.");
    return;
  }

  const result = [];

//extract timestamp
  const timestamp = input.feed.updated?.[0] || null;

//Title
  const roadNames=await getEventTitle(input)

//GET lat and long
  const { lat, long } = await lookupAddress(roadNames);

//generateUUID
  const generateUUID = getuuid(roadNames);

  //result
  result.push({
    UUID:generateUUID,
    title:roadNames,
    Timestamp:timestamp,
    lat:lat,
    long:long
  });
  console.log("Processed results:", JSON.stringify(result, null, 2));
  return result;
}






