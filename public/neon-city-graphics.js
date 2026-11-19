// Device-local presentation settings, independent of gameplay and saved runs.
export const CITY_GRAPHICS_PRESETS=Object.freeze({
 low:{label:'Low',pixelRatio:1,shadows:false,shadowSize:512,waterMotion:false,foliageMotion:false},
 balanced:{label:'Balanced',pixelRatio:1.5,shadows:true,shadowSize:1024,waterMotion:true,foliageMotion:true},
 high:{label:'High',pixelRatio:2,shadows:true,shadowSize:2048,waterMotion:true,foliageMotion:true}
});
export function cityGraphicsSettings(value,devicePixelRatio=1){
 const quality=Object.hasOwn(CITY_GRAPHICS_PRESETS,value)?value:'balanced';
 return {...CITY_GRAPHICS_PRESETS[quality],quality,pixelRatio:Math.max(.5,Math.min(Number(devicePixelRatio)||1,CITY_GRAPHICS_PRESETS[quality].pixelRatio))};
}
