import getBbox from "./bbox.js";
import FileSystem from "fs";
import { URL ,URLSearchParams } from "url";


const baseURL = 'https://api.tomtom.com/traffic/services/5/incidentDetails';
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
// params.append('t', trafficIdModel);
params.append('timeValidityFilter', timeValidityFilter);


url.search = params.toString();


console.log(url.toString());


fetch(url)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const filteredData = filterIncidentData(data); 
    console.log("Filtered Data:", JSON.stringify(filteredData, null, 2));
    FileSystem.writeFileSync('filtered_incidents.json', JSON.stringify(filteredData, null, 2));
    console.log('Filtered data saved to filtered_incidents.json');
   })
  .catch(error => {
    console.error("Error fetching data:", error);
  });

  const filterIncidentData = (data) => {
    return data.incidents.map(incident => {
      const properties = incident.properties || {};
      const geometry = incident.geometry || {};

      let coordinates = [null, null]; 
      if (geometry.type === "Point" && geometry.coordinates.length === 2) {
        coordinates = geometry.coordinates
      } else if (geometry.type === "LineString" && geometry.coordinates.length > 0) {
        coordinates = geometry.coordinates[0]; 
      }

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
  
      return {
        id: properties.id || null,
        long: coordinates[0],
        lat:coordinates[1],
        timestamp: properties.startTime || null,
        provider: "TomTom",
        title: properties.from || null,
        probabilityOfOccurrence: properties.probabilityOfOccurrence || null,
        props: [
          {
            numberOfReports: properties.numberOfReports || null,
          },
          {
            eventtype: properties.events && properties.events[0] ? properties.events[0].description : null,
          },
          {
            reporter_reliability: reporterReliability,
          },
          {
            timestamp: properties.startTime || null,
          }
        ]
      };
    });
  };
  


 
