import { TypeTotalEcosystemService } from "../../enums/es/typeTotalEcosystemService";

export const ScaleTypeES: Record<TypeTotalEcosystemService, {min:number, max:number, color:string}[]> = {
  [TypeTotalEcosystemService.total]:[
    { min: 0, max: 4, color: '#e5f5e0' },
    { min: 4, max: 8, color: '#a1d99b' },
    { min: 8, max: 12, color: '#74c476' },
    { min: 12, max: 16, color: '#31a354' },
    { min: 16, max: 20, color: '#006d2c' }
   ],
   [TypeTotalEcosystemService.provisioning]:[
    { min: 0, max: 1, color: '#ffffcc' }, 
    { min: 1, max: 2, color: '#ffff99' },
    { min: 2, max: 3, color: '#ffff66' },
    { min: 3, max: 4, color: '#ffff33' },
    { min: 4, max: 5, color: '#cccc00' } 
   ], 
   [TypeTotalEcosystemService.regulation]:[ 
    { min: 0, max: 2, color: '#deebf7' },
    { min: 2, max: 4, color: '#9ecae1' },
    { min: 4, max: 6, color: '#6baed6' },
    { min: 6, max: 8, color: '#3182bd' },
    { min: 8, max: 10, color: '#08519c' }
  ],
  [TypeTotalEcosystemService.cultural]:[
    { min: 0, max: 1, color: '#fff5eb' },   
    { min: 1, max: 2, color: '#fee6ce' },
    { min: 2, max: 3, color: '#fdae6b' },
    { min: 3, max: 4, color: '#fd8d3c' },
    { min: 4, max: 5, color: '#e6550d' },
    { min: 5, max: 6, color: '#a63603' }  
  ],
  [TypeTotalEcosystemService.none]:[]
};