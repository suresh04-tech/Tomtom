import bboxResult from "./bbox.js";
const baseURL = "https://api.tomtom.com"; 
const versionNumber = "5";
const key = "nGtguu4ABAYpREI9s7dEddymCgjtQqbS"; 
const fields = "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime,tmc{countryCode,tableNumber,tableVersion,direction,points{location,offset}}}}}"; 
const language = "en-GB"; 
const t = "1111"; 
const categoryFilter = "unknown";
const timeValidityFilter = "present";
const ids="ff3312de-04e3-43c5-85e0-3cf9a6d2a10d"

const bbox = bboxResult;
console.log(bbox);

const url = `${baseURL}/traffic/services/${versionNumber}/incidentDetails?key=${key}&ids=${ids}&fields=${fields}&language=${language}&t=${t}&categoryFilter=${categoryFilter}&timeValidityFilter=${timeValidityFilter}`;



fetch(url)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log("API Response:", JSON.stringify(data,null,2));
  })
  .catch(error => {
    console.error("Error fetching data:", error);
  });


 


