import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js';
import getuuid from 'uuid-by-string';

const NIAGARA_FALLS_FIRE_ALERT_RSS_FEED = process.env.NIAGARA_FALLS_FIRE_ALERT_RSS_FEED ?? "http://localhost:4000/xml"
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? "AIzaSyCf39T5pe1d25umPF98HvufsnZt4rE8vwo";


async function fetchDataFromFireAlertRSSFeed() {
  try {
    const response = await fetch(NIAGARA_FALLS_FIRE_ALERT_RSS_FEED);
    if (!response.ok) {
      throw new Error(`[NIAGARA_FIRE_ALERT_API] Cannot able to fetch response :${response.status}`);
    }
    const xmlData = await response.text();

    const jsonData = await parseStringPromise(xmlData);
    console.log('Parsed JSON Data:', jsonData);

    return jsonData;

  } catch (error) {
    console.error('Error Try to fetching the data :', error);
  }
}


async function getFireAlertUniqueLocationTitle(input) {
  const seenTitles = new Set();
  const uniqueAlertTitles = [];

  if (!input || !input.feed) {
    console.log('No valid "entry" data found in the input');
    return [];
  }

  const entries = input.feed.entry;
  entries.forEach((entry) => {

    if (!entry.title) {
      console.log('No valid "title" array found in entry');
      return;
    }

    const titleObj = entry.title[0];
    if (!titleObj && titleObj._) {
      console.log("there is no title founded")
      return;
    }

    let locTitle = titleObj._;
    const timestamp = entry.updated && entry.updated[0] ? entry.updated[0] : new Date().now().toISOString();

    locTitle = locTitle.replace("Active Fire Call at", " ").trim();

    //generating UUID
    const alertId = getuuid(locTitle);

    if (!seenTitles.has(locTitle)) {
      seenTitles.add(locTitle);

      uniqueAlertTitles.push({
        id: alertId,
        title: locTitle,
        timestamp: timestamp
      });
    }

  });
  return uniqueAlertTitles;
}

async function processAlert(Alert) {
  const alertId = Alert.id;
  try {
      //getting TimeZone
      const utcTimestamp = convertToUTC(Alert.timestamp);

      //getting lat and long
      const { lat, long } = await lookupAddress(Alert.title);

      //mapss
      // const screenshot = await mapScreenShot(alertId, long, lat, 'NFFS');

      return {
        UUID: alertId,
        lat: lat,
        long: long,
        timestamps: utcTimestamp,
        title:Alert.title,
        eventColor:'#8B0000',
        eventType:'Fire Alert',
      //mapScreenShot:screenshot,
        confidenceRating:'High',
        reportBy: "Niagara Falls Fire Department",
      }
  } catch (error) {
    console.error('Error processing NiagaraFalls alert:', error);
    await insertFailedAlertInRedis(alertId,Alert,"NIAGARAFALLS", error.message);
    throw error;
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
  const searchQuery = [`${cleanedStreet}, Niagara Falls, Ontario, Canada`];

  for(const query of searchQuery){
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&components=country:CA|administrative_area:ON|locality:Niagara%20Falls`;

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
async function main(token = "") {
  try {
    const jsonData = await fetchDataFromFireAlertRSSFeed();
    const unqiueAlerts = await getFireAlertUniqueLocationTitle(jsonData);
    const formattedData = await Promise.all(unqiueAlerts.map( async (Alert) => {
    return await processAlert(Alert)
   }));
    console.log("result",formattedData)
  } catch (error) {
    console.error("[NIAGARA_API] Error occurred :: ", error);
  }
}
main();






