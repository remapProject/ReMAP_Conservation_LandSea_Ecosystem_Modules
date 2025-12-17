import * as XLSX from "xlsx";
import { readFileSync } from "fs";

const filePath='./files/mapping/ecosystem/Table_13_EUNIS_ES.xlsx';



export default class TableHabitsServices {
  private headers: string[];
  private rows: any[][];

  constructor() {
    let file = filePath
    const data = readFileSync(file);
    const workbook = XLSX.read(data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    this.headers = (jsonData[1] as string[]).map(header =>
      typeof header === "string" ? header.trim() : String(header ?? "").trim()
    );
    this.rows = jsonData.slice(2) as any[][];
  }
  public getTableHabitsServices() {
    const result : any[]= [];
    this.rows.forEach((row, i) => {
      if(i!=0){
        const name = row[0] as string; // Primera columna como nombre
        if(name){
          const nameClean = name.replace(/\*/g, ''); // Eliminar asterisco al final
          const datos = this.headers.slice(1).reduce((acc, _header, index) => {
            acc.push(row[index + 1]);
            return acc;
          }, [] as string[]);
          result.push({ [nameClean]:datos });
        }
      }
    });
    return result;
  }

  public getListHabitatsByEcosystem(ecosystem:string){
    let result = {};
    this.rows.forEach((row, i) => {
     
      if(i!=0){
        const name = row[0];
        if(name){
          this.headers.slice(1).forEach((header, index) => {
            if (header === ecosystem) {
              result={...result, [name]: row[index + 1]};
            }
          });
        }
      }
    });
    return result;
  }

  public getListEcosystemByHabitats(habitat:string){
    let result={};
    this.rows.forEach((row) => {
       if(row[0] === habitat) {
        const habitats = row.slice(1);
        this.headers.slice(1).forEach((header, index) => {
          if (habitats[index]) {
            result={...result,[header]: habitats[index]};
          }
        });
      }
    });
    return result;
  }

}



