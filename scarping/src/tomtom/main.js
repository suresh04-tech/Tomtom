import getBbox from "./bbox.js";
import FileSystem from "fs";
import { URL, URLSearchParams } from "url";
//import { captureMapScreenshot } from "./mapss.js";
import dotenv from "dotenv";

dotenv.config()

// EventColor
function getEventColor(eventType) {
  const eventColors = {
    0: '#D3D3D3', // Unknown - Gray
    1: '#FF6347', // Accident - Red
    2: '#A9A9A9', // Fog - Dark Gray
    3: '#FFA500', // Dangerous Conditions - Orange
    4: '#1E90FF', // Rain - Dodger Blue
    5: '#ADD8E6', // Ice - Light Blue
    6: '#FFFF00', // Jam - Yellow
    7: '#FF4500', // Lane Closed - Orange Red
    8: '#800080', // Road Closed - Purple
    9: '#32CD32', // Road Works - Lime Green
    10: '#D2691E', // Wind - Chocolate
    11: '#0000FF', // Flooding - Blue
    14: '#FF1493'  // Broken Down Vehicle - Deep Pink
  };
  return eventColors[eventType] || '#808080'; // Default color: Gray
}

//mapss
//  async function captureMapScreenshot(lat, lng, outputDir) {
//   if (!lat || !lng) {
//     console.error('Invalid latitude or longitude:', lat, lng);
//     return;
//   }
//   const browser = await chromium.launch({ headless: true });
//   const context = await browser.newContext();
//   const page = await context.newPage();
//   if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir);
//   }
//   const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
//   await page.goto(mapUrl, { waitUntil: 'networkidle' });
//   await page.waitForSelector('#searchbox');
//   const screenshotPath = path.join(outputDir, `map-screenshot-${lat}-${lng}.png`);
//   await page.screenshot({ path: screenshotPath, fullPage: true });

//   console.log(`Screenshot saved: ${screenshotPath}`);

//   await browser.close();

//   return screenshotPath;
// }

const baseURL = process.env.TT_API_URL;
const bbox = getBbox(-73.935242, 40.730610, 10); 
const fields = "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime,tmc{countryCode,tableNumber,tableVersion,direction,points{location,offset}}}}}";
const key = 'nGtguu4ABAYpREI9s7dEddymCgjtQqbS';
const language = 'en-GB';
const trafficIdModel = '1111';
const timeValidityFilter = 'present';

const url = new URL(baseURL);

const params = new URLSearchParams();
params.append('key', key);
params.append('bbox', bbox);
params.append('fields', fields);  
params.append('language', language);
params.append('t', trafficIdModel);
params.append('timeValidityFilter', timeValidityFilter);

url.search = params.toString();

console.log(url.toString());

const fetchData = async () => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const filteredData = await filterIncidentData(data); // Await the async filterIncidentData function
    FileSystem.writeFileSync('filtered_incidents.json', JSON.stringify(filteredData, null, 2));
    console.log('Filtered data saved to filtered_incidents.json');
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

// This is now an async function that handles each incident asynchronously
const filterIncidentData = async (data) => {
  return await Promise.all(data.incidents.map(async (incident) => {
    const properties = incident.properties || {};
    const geometry = incident.geometry || {};

    let coordinates = [null, null];
    if (geometry.type === "Point" && geometry.coordinates.length === 2) {
      coordinates = geometry.coordinates;
    } else if (geometry.type === "LineString" && geometry.coordinates.length > 0) {
      coordinates = geometry.coordinates[0];
    }

    let lat=coordinates[1];
    let lng=coordinates[0];
    if (lng === null || lat === null) {
      console.error('Invalid coordinates:', coordinates);
      return; 

    }

    // Debugging output for coordinates
    console.log("Longitude:", lng, "Latitude:", lat);

  
    // const screenshot = await captureMapScreenshot(lat,lng,'./screenshot');

    let reporterReliability = "High";
    const probability = properties.probabilityOfOccurrence || "";

    if (probability === "certain") {
      reporterReliability = "High";
    } else if (probability === "probable") {
      reporterReliability = "Medium";
    } else if (probability === "risk_of") {
      reporterReliability = "Low";
    } else if (probability === "improbable") {
      reporterReliability = "Very Low";
    }

    const event_type = properties.events && properties.events[0] ? properties.events[0].description : null;

    return {
      id: properties.id || null,
      long: coordinates[0],
      lat: coordinates[1],
      timestamp: properties.startTime || null,
      provider: "TomTom",
      title: properties.from || null,
      probabilityOfOccurrence: properties.probabilityOfOccurrence || null,
      props: [
        {
          numberOfReports: properties.numberOfReports || null,
        },
        {
          eventtype: event_type,
        },
        {
          eventColor: await getEventColor(event_type),
        },
        {
          reporter_reliability: reporterReliability,
        },
        {
          timestamp: properties.startTime || null,
        }
      ]
    };
  }));
};

// Call the fetchData function to execute
fetchData();
