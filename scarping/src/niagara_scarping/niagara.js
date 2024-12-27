import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js';
import getuuid from 'uuid-by-string';


const GOOGLE_API_KEY=process.env.GOOGLE_API_KEY ?? "AIzaSyCf39T5pe1d25umPF98HvufsnZt4rE8vwo";


//getting xml file from API and convert into JSON
async function fetchXmlConvertJson() {
  const url = 'http://localhost:4000/xml';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const xmlData = await response.text();
    console.log('Fetched XML Data:', xmlData);

    const jsonData = await parseStringPromise(xmlData);
    console.log('Parsed JSON Data:', jsonData);
    return jsonData;
   

  } catch (error) {
    console.error('Error fetching or parsing XML data:', error);
  }
}


async function processAlert(input) {
  console.log("file",input)
  const seenTitles = new Set(); 
  const uniqueTitles = []; 
  const uniqueTimestamps = []; 
  
  if (input && input.feed && Array.isArray(input.feed.entry)) {
    input.feed.entry.forEach((entry) => {
      if (Array.isArray(entry.title)) {
        entry.title.forEach((titleObj) => {
          let entTitle = titleObj && titleObj._ ? titleObj._ : 'No Title';
          const timestamp = entry.updated && entry.updated[0] ? entry.updated[0] : 'No Timestamp';
  
          entTitle = entTitle.replace("Active Fire Call at", "").trim();
          let title = String(entTitle);
  
          if (!seenTitles.has(title)) {
            seenTitles.add(title);
            uniqueTitles.push(title);
            uniqueTimestamps.push(timestamp);
          }
        });
      } else {
        console.warn('No valid "title" array found in entry');
      }
    });
  } else {
    console.error('No valid "entry" data found in the input');
  }
  

  try{
    while(uniqueTitles.length>0){
    //currentTitle
    const currentTitle= uniqueTitles.shift();

    //currentTimestamp
    const currentTimestamp=uniqueTimestamps.shift();

    //generateUUID
    const generateUUID =await getuuid(currentTitle);

    //getting TimeZone
    const utcTimestamp = await convertToUTC(currentTimestamp);

    //getting lat and long
    const { lat, long } = await lookupAddress(currentTitle);

    console.log( {
    UUID: generateUUID, 
    title: currentTitle, 
    timestamps: utcTimestamp,
    lat:lat,
    long:long
    });
   }
  }catch(err){
  console.log(err)
  }
}


//convertTimeZone
function convertToUTC(timestamp) {
  const date = new Date(timestamp);
  const utcTimestamp = date.toISOString();
  return utcTimestamp;
}


//googlemapAPI
const lookupAddress = async (roadNames) => {
  const cleanedStreet = cleanAddress(roadNames);
  const searchQuery = `${cleanedStreet}, Niagara Falls, Ontario, Canada`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&components=country:CA|administrative_area:ON|locality:Niagara%20Falls`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const { location } = data.results[0].geometry;
      const result = {
        lat: location.lat,
        long: location.lng,
        formattedAddress: data.results[0].formatted_address,
      };
      return result;
    }
  } catch (error) {
    console.error(`Error looking up address for query "${roadNames}":`, error);
  }
  throw new Error('Failed to find location after multiple attempts');
};


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


//main
async function main(token ="",url="",) {
  try{
  const jsonData = await fetchXmlConvertJson();
  const result =await processAlert(jsonData);
  console.log(result)

} catch (error) {
  console.error("An error occurred:", error);
}
}
main();






