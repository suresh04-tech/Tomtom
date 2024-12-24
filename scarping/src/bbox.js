import bbox from '@turf/bbox';
import buffer from '@turf/buffer';
 
const getBbox = (long, lat, radius) => {
  const radiusInKM = parseInt(radius);
 
  return bbox(
    buffer({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(long), parseFloat(lat)]
      }
    }, radiusInKM > 15 ? 15 : radiusInKM, { units: 'kilometers' })
  );
};

// const bboxResult = getBbox(52.46737410834897, -1.4180792422930657, 30);
// console.log('Bounding Box Result:', bboxResult);
 
export default getBbox;