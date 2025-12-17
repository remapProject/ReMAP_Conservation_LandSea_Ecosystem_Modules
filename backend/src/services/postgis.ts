import { FeatureCollection } from "../interfaces/featureCollections";
import { Client } from "pg";
import {
  Postgresql_db,
  Postgresql_host,
  Postgresql_port,
  Postgresql_user,
  Postgresql_pass,
} from "../config";
import { TypeModule } from "../enums/TypeModule";
interface DownloadUser {
  id: string;
  admin: boolean;
  user_email: string | null;
  layer_file_name_1: string;
  layer_file_name_2: string;
  name_file: string;
  finished: boolean;
  error: string | null;
  time_link: string;
  moduleName: TypeModule;
  name_style: string;
}

const client = new Client({
  user: Postgresql_user,
  host: Postgresql_host,
  database: Postgresql_db,
  password: Postgresql_pass,
  port: parseInt(Postgresql_port, 10),
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() => console.log("Postgis conectado"))
  .catch((err) => console.error("Error al conectar con Postgis:", err));

export default class PostgisService {
  //  async connectToDB(): Promise<void> {
  //     try {
  //        await client.connect();
  //        console.log('Conexión a la base de datos establecida');
  //     } catch (error) {
  //        console.error('Error al conectar a la base de datos:', error);
  //        throw error;
  //     }
  //  }

  async disconnectToDB(): Promise<void> {
      try {
         await client.end();
         console.log('Conexión a la base de datos cerrada');
      } catch (error) {
         console.error('Error al cerrar la conexión:', error);
      }
   }
  async checkExistTableDB(name_layer:string, schema:string='public'): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = $1 
          AND table_name = $2
        );
      `;
      const values = [schema, name_layer];
      const result = await client.query(query, values);
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error - checkExistTableDB:", error);
      throw new Error("Error checking if table exists in DB");
    }
  }
  
  async putDataLayer(geojson: FeatureCollection, name_layer:string, module: TypeModule, schema:string='public'): Promise<void> {
    const getPropertiesKeys = (properties: any, module:string=''): any => {
      let list_keys_required: string[]=[], 
        list_cols: string[]= [], 
        res:string='(';
      
      list_keys_required=(module=='msp')? ['designation', 'seausefct', 'hilucsmsp', 'color'] : ['hilucsmsp_emodnet', 'type_buffer', 'hilucsmsp_costal'];
      let list_keys_orginal=['geom',...Object.keys(properties)]
      list_cols= list_keys_required.filter(col=>!list_keys_orginal.includes(col));
      if(list_cols.length!==0) throw new Error(`Error - putDataLayer: Attributes layer not found: ${list_cols.join(', ')}`); 
      res+=list_keys_orginal.join(', ');
      res+=')';
      return {columns_query:res, list_keys:list_keys_orginal};
    }
    try {
      const batchSize = 750; // Tamaño del lote
      const totalFeatures = geojson.features.length; 
      console.log(`Total de features: ${totalFeatures}`);
      let {columns_query, list_keys} = getPropertiesKeys(geojson.features[0].properties, (module== TypeModule.msp) ? 'msp' : 'lsi') ;
      for (let i = 0; i < totalFeatures; i += batchSize) {
        const batch = geojson.features.slice(i, i + batchSize);
        const values: any[] = [];
        const placeholders: string[] = [];

        batch.forEach((feature, index) => {
          const { properties, geometry } = feature;
          
          const baseIndex = index * list_keys.length;

  // construir placeholder dinámico respetando si la columna es geom
          let token_geom=false;
          let ph = list_keys
            .map((col:string, i:number) => {
              const paramIndex = baseIndex + i + 1;
              const lower = col.toLowerCase();
              if (token_geom===false && (lower === "geom" || lower === "geometry")) {
                return `ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}), 4326)`;
              } else{
                return `$${paramIndex}`;
              }
            })
            .join(", ");
          placeholders.push(`(${ph})`);

          // push de valores en el mismo orden que columnsArray
          for (const col of list_keys) {
            const lower = col.toLowerCase();
            if (lower === "geom" || lower === "geometry") {
              values.push(JSON.stringify(geometry));
              continue;
            }

            // obtener valor directamente o buscando clave normalizada
            let val = (properties as any)[col];
            if (typeof val === "undefined") {
              const altKey = col.toLowerCase().replace(/\s+/g, "");
              const found = Object.keys(properties).find(
                (k) => k.toLowerCase().replace(/\s+/g, "") === altKey
              );
              val = found ? (properties as any)[found] : null;
            }
            values.push(val === undefined ? null : val);
          } 
        });
        
        const query = `
            INSERT INTO ${schema}."${name_layer}" ${columns_query}
            VALUES ${placeholders.join(', ')}
        `;
        await client.query(query, values);
        console.log(`Lote ${Math.ceil(i / batchSize) + 1} insertado con éxito (${batch.length} features).`);
      }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        throw new Error()
    }
  }
   
  async *getLayerGeoJSON(name_layer:string, schema:string='public'): AsyncGenerator<any> {
      let offset = 0,batchSize=1000;
      while (true) {
        const query = `
          SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(feature)
          ) AS geojson
          FROM (
            SELECT jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(geom)::jsonb,
              'properties', to_jsonb(t.*) - 'geom'
            ) AS feature
            FROM ${schema}."${name_layer}" AS t
            LIMIT ${batchSize} OFFSET ${offset}
          ) AS subquery;
        `;

      console.log(
        `${name_layer} Obteniendo datos desde ${offset} hasta ${offset + batchSize}...`
      );
      try {
        const result = await client.query(query);
        if (
          !result.rows[0] ||
          !result.rows[0]?.geojson ||
          result.rows[0]?.geojson.features === null ||
          result.rows[0]?.geojson.features.length === 0
        ) {
          break; // 🔹 Si ya no hay más registros, terminamos
        }

        yield result.rows[0].geojson;
        offset += batchSize; // 🔹 Avanza al siguiente bloque
      } catch (error) {
        console.error("error", error); 
        return null;
      }
    }
  }
  async updateDataLayer(tableName:string,schema:string='public', attributeUpdate:string, update:{[id:string]:any}, idColumn:string='id'): Promise<void> {
    try {
      const ids = Object.keys(update);
      if (!ids.length) return;
      const cases = ids.map((_id, idx) => `WHEN "${idColumn}" = $${idx + 1} THEN $${ids.length + idx + 1}`)
        .join(' ');

      const query = `
        UPDATE ${schema}."${tableName}"
        SET "${attributeUpdate}" = CASE
          ${cases}
          ELSE "${attributeUpdate}"
        END
        WHERE "${idColumn}" IN (${ids.map((_, idx) => `$${idx + 1}`).join(', ')});
      `;

      // Construye los valores: primero los ids, luego los nuevos valores
      const values = [
        null,
        ...ids,
        ...ids.map(id => update[id])
      ].slice(1);
      await client.query(query, values);
      console.log(`Actualizados ${ids.length} polígonos en ${tableName} con un solo UPDATE.`);
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      throw new Error("Error al actualizar datos");
    }
  }

  async createDownloadUser( 
    id_process: string, 
    admin: boolean, 
    user_email: string, 
    layer_file_1: string, 
    layer_file_2: string, 
    output_name_file: string, 
    finished: boolean, 
    error: string | null, 
    time_link: string, 
    moduleName: TypeModule, 
    nameStyle: string
  ): Promise<void> {
    try {
      const query = `
            insert into downloads_files.download_users(
            id, admin, user_email, layer_file_name_1, layer_file_name_2, name_file, finished, error, time_link, "moduleName", name_style)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           `;
      const values = [
        id_process,
        admin,
        user_email,
        layer_file_1,
        layer_file_2,
        output_name_file,
        finished,
        error,
        time_link,
        moduleName,
        nameStyle
      ];
      await client.query(query, values);
    } catch (error) {
      console.error("Error - createDownloadUser: ", error);
      throw new Error("Error al insertar en la tabla download_users");
    }
  }

  async getDownloadUserById(id_process: string): Promise<DownloadUser | null> {
    try {
      const query = `SELECT * FROM downloads_files.download_users WHERE id = $1`;
      const result = await client.query(query, [id_process]);
      return result.rows.length ? result.rows[0] : null;
    } catch (error) {
      console.error("Error - getDownloadUserById:", error);
      throw new Error("Error getting download user");
    }
  }

  async updateDownloadUser(id_process: string,updateData: Partial<DownloadUser>): Promise<void> {
    try {
      const fields = Object.keys(updateData);
      if (!fields.length) return;
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(", ");
      const values = [
        id_process,
        ...fields.map((field) => (updateData as any)[field]),
      ];
      const query = `UPDATE downloads_files.download_users SET ${setClause} WHERE id = $1`;
      await client.query(query, values);
    } catch (error) {
      console.error("Error - updateDownloadUser:", error);
      throw new Error("Error updating the download user");
    }
  }

  async checkExistingLayers(name1: string, name2: string): Promise<boolean> {
    try {
      const query = `
       SELECT EXISTS (
         SELECT 1 FROM downloads_files.download_users 
         WHERE 
           layer_file_name_1 = $1 AND
           layer_file_name_2 = $2 AND
           admin = true
       )
     `;
      const result = await client.query(query, [name1, name2]);
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error - checkExistingLayers:", error);
      throw new Error("Error checking existing layers");
    }
  }

  async updateLayerHabitats( list_add_habitats:{[key:string]:any[]}, name_layer:string){
    try {
      let queryAttribute=`ALTER TABLE public."${name_layer}" ADD COLUMN IF NOT EXISTS total_ecosystemservices integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_provisioning integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_regulation_maintenance integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_cultural integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ecosystem_services text;`;

      await client.query(queryAttribute); 
      
      const query = ` UPDATE public."${name_layer}"
        SET total_ecosystemservices = $1,
            total_provisioning = $2,
            total_regulation_maintenance = $3,
            total_cultural = $4,
            ecosystem_services = $5
        WHERE "referenceHabitatTypeId" = $6;
      `;
      let list_habitats_on_layer =await this.getListHabitatsOnLayer(name_layer);

      let list_filter_habitats: string[] = list_habitats_on_layer.filter(habitatId => String(habitatId) in list_add_habitats);
      for( let i=0;i< list_filter_habitats.length; i++){ 
        const [total, provisioning, regulation, cultural, list_code_es] = list_add_habitats[list_filter_habitats[i]];
        const name_habitat = list_filter_habitats[i];
        const values = [total, provisioning, regulation, cultural,list_code_es.join(','), name_habitat];
        try{
          await client.query(query, values);
        }catch (error) {
          console.error("Error - updateLayerHabitats query update:", error);
          throw new Error("Error updating habitats in layer");
        }
      }
      return true;
    } catch (error) {
      console.error("Error - updateLayerHabitats:", error);
      throw new Error("Error updating habitats in layer");    
    }

  }

  async getListHabitatsOnLayer(name_layer: string){
    try {
      const query = `
        SELECT  tab."referenceHabitatTypeId"
        FROM public."${name_layer}" as tab
        group by tab."referenceHabitatTypeId";
      `;
      const result = await client.query(query);
      if (result.rows.length === 0) {
        return [];
      }else {
        return result.rows.map(row => row.referenceHabitatTypeId);
      }
    } catch (error) {
      console.error("Error - getListHabitatsOnLayer:", error);
      throw new Error("Error getting habitats from layer");
    }
  }
}
