import fetch from 'node-fetch';
import xml2js from 'xml2js';
import getUuid from 'uuid-by-string';
import mapScreenShot from '../utils/map-screen-shot.mjs';
import moment from 'moment-timezone';
import {
  storeAlertsAndSendToNearByUsers,
  checkIfFailedAlertExistsInRedis,
  insertFailedAlertInRedis,
  isAlertExistsInRedis
} from '../utils/redis-utils.mjs';
 
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const TFS_API_URL = process.env.TFS_API_URL;
 
const EventType = {
  VEHICLE_SPILL: 'Vehicle - Spill Clean Up',
  VEHICLE_SPILL_NON_EMERGENCY: 'Vehicle - Spill Clean Up - Non Emergency',
  VEHICLE_INJURY: 'Vehicle - Personal Injury',
  VEHICLE_INJURY_HIGHWAY: 'Vehicle - Personal Injury Highway',
  VEHICLE_FIRE: 'Vehicle Fire',
  VEHICLE_ACCIDENT_FIRE: 'Vehicle Accident with Fire',
  VEHICLE_ACCIDENT_TRAPPED: 'Vehicle Accident - Trapped',
  VEHICLE_ACCIDENT_TRAPPED_HIGHWAY: 'Vehicle Accident - Trapped - Highway',
  VEHICLE_ACCIDENT_MINOR_FUEL: 'Vehicle Accident - Minor Fuel Leak',
  VEHICLE_ACCIDENT_MAJOR_FUEL: 'Vehicle Accident - Major Fuel Leak'
};
 
const eventTypeConfig = {
  [EventType.VEHICLE_SPILL]: { color: '#FFA500', simplifiedEventType: 'Vehicle Spill' },
  [EventType.VEHICLE_SPILL_NON_EMERGENCY]: { color: '#FFD700', simplifiedEventType: 'Non-Emergency Vehicle Spill' },
  [EventType.VEHICLE_INJURY]: { color: '#FF4500', simplifiedEventType: 'Vehicle Injury' },
  [EventType.VEHICLE_INJURY_HIGHWAY]: { color: '#FF0000', simplifiedEventType: 'Highway Vehicle Injury' },
  [EventType.VEHICLE_FIRE]: { color: '#8B0000', simplifiedEventType: 'Vehicle Fire' },
  [EventType.VEHICLE_ACCIDENT_FIRE]: { color: '#B22222', simplifiedEventType: 'Vehicle Accident with Fire' },
  [EventType.VEHICLE_ACCIDENT_TRAPPED]: { color: '#DC143C', simplifiedEventType: 'Vehicle Accident - Trapped' },
  [EventType.VEHICLE_ACCIDENT_TRAPPED_HIGHWAY]: { color: '#FF1493', simplifiedEventType: 'Highway Vehicle Accident - Trapped' },
  [EventType.VEHICLE_ACCIDENT_MINOR_FUEL]: { color: '#FF69B4', simplifiedEventType: 'Minor Fuel Leak' },
  [EventType.VEHICLE_ACCIDENT_MAJOR_FUEL]: { color: '#FF00FF', simplifiedEventType: 'Major Fuel Leak' }
};
 
const getEventTypeInfo = (eventType) =>
  eventTypeConfig[eventType] || { color: '#EC7518', simplifiedEventType: 'Unknown' };
 
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
 
const lookupAddress = async (incident, alertId) => {
  const data = incident.data || incident;
  const primeStreet = data.prime_street[0];
  const crossStreets = data.cross_streets[0];
 
  const cleanedPrimeStreet = cleanAddress(primeStreet);
  const cleanedCrossStreets = cleanAddress(crossStreets);
 
  const searchQueries = [
    `${cleanedPrimeStreet} at ${cleanedCrossStreets}, Toronto, Ontario`,
    `${cleanedPrimeStreet}, Toronto, Ontario`,
    `${cleanedCrossStreets}, Toronto, Ontario`,
    `${cleanedPrimeStreet} ${cleanedCrossStreets}, Toronto, Ontario`
  ];
 
  for (const query of searchQueries) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&components=country:CA|administrative_area:ON|locality:Toronto`;
 
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
  }
 
  throw new Error('Failed to find location after multiple attempts');
};
 
const processAlert = async (alert) => {
 
  console.log('Processing TFS Alert :: ', alert);
 
  const alertId = getUuid(alert.event_num[0]);
 
  const alertExists = await isAlertExistsInRedis(alertId);
 
  if (alertExists) {
    console.log(`Alert ${alertId} already exists in redis, skipping processing.`);
    return null;
  }
 
  const isFailedAlert = await checkIfFailedAlertExistsInRedis(alertId);
 
  if(isFailedAlert) {
    console.log(`Alert ${alertId} is a previously failed item, skipping processing.`);
    return null;
  }
 
  try {
    const { lat, long } = await lookupAddress(alert, alertId);
    const { color: eventColor, simplifiedEventType } = getEventTypeInfo(alert.event_type[0]);
    const timestamp = moment.tz(alert.dispatch_time[0], 'America/Toronto').utc().format();
    const screenshot = await mapScreenShot(alertId, long, lat, 'TFS');
 
    return {
      id: alertId,
      lat,
      long,
      timestamp,
      provider: 'TFS',
      title: `${alert.prime_street[0]} & ${alert.cross_streets[0]}`,
      eventColor,
      eventType: simplifiedEventType,
      mapScreenshot: screenshot,
      reportBy: 'Toronto Fire Services',
      props: [
        { alert_type: simplifiedEventType },
        { dispatch_time: moment.utc(timestamp).format('MMMM Do YYYY, h:mm:ss a z') },
        { street_info: `${alert.prime_street[0]} & ${alert.cross_streets[0]}` },
        { event_number: alert.event_num[0] }
      ],
      confidenceRating: 'High'
    };
  } catch (error) {
    console.error('Error processing TFS alert:', error);
    await insertFailedAlertInRedis(alertId, alert, "TFS", error.message);
    throw error;
  }
};
 
export const tfsProvider = async (token) => {
  console.log('calling TFS');
  const parser = new xml2js.Parser();
 
  try {
    const response = await fetch(TFS_API_URL);
    const body = await response.text();
   
    const convertedBody = await new Promise((resolve, reject) => {
      parser.parseString(body, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
 
    const filtered = convertedBody.tfs_active_incidents.event.filter(alert =>
      Object.values(EventType).includes(alert.event_type[0]) &&
      (alert.cross_streets[0].length > 3 || alert.prime_street[0].length > 3)
    );
 
    const formattedData = await Promise.all(filtered.map( async (alert) => {
      return await processAlert(alert)
   }));
    const newAlerts = formattedData.filter(Boolean);
 
    console.log('TFS NEW ALERTS :: ', newAlerts);
    await Promise.all(newAlerts.map(
      async (alert) => {
        await storeAlertsAndSendToNearByUsers(alert)
    }));
 
  } catch (error) {
    console.error('Error in tfsProvider:', error);
    throw error;
  }
};