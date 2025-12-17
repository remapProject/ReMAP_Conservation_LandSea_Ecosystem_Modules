import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";
import { exec } from "child_process";
import { Geoserver_host, Geoserver_pass, Geoserver_user } from "../config";

import Service from "./service";
import { Values } from "../enums/values";
import { Color } from "../enums/color";
import { TypeGeom } from "../enums/typegeom";
import { TypeAttribute } from "../enums/typeAttribute";
import PostgisService from "./postgis";
import { TypeModule } from "../enums/TypeModule";
import { Values_Lsi } from "../enums/lsi/valuesLsi";
import { Color_Lsi } from "../enums/lsi/colorLsi";
import axios from "axios";
import { TypeTotalEcosystemService } from "../enums/es/typeTotalEcosystemService";
import { ScaleTypeES } from "../constants/ecosystem/typeColorTypeES";

 const workspace = "workspace";
 const datastore = "datastore";

const listDatastoresResults = ["ReMAP_intersection_Conservation", "ReMAP_intersection_LandSea", "ReMAP_intersection_EcosystemServices"];
const listSchemas_BD = ["result_conservation", "result_LandSea", "result_EcosystemServices"];
const service = new Service();
export default class GeoserverService {
  async getLayers(_req: Request, res: Response) {
    try {
      let response = await service.get(`${Geoserver_host}/rest/workspaces/${workspace}/layers`);
      let list_layers_filter = response.layers?.layer?.filter((layer: any) => !layer.name.includes('imported layer'));
      res.status(200).json(list_layers_filter?.map((layer: any) => layer.name));
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLayers");
    }
  }

  async getStylesLayers(_req: Request, res: Response) {
    let list_layers_styles:any[]=[], list_active: any ={};
    try{
      let response = await service.get(`${Geoserver_host}/${workspace}/wms?request=getCapabilities`);
      const response_XML=await parseStringPromise(response);
      const layers=response_XML.WMS_Capabilities.Capability[0].Layer[0].Layer;
      const promises = layers.map(async (layer:any) => {
        let name = layer.Name[0];
        let styles = layer.Style.map((style:any)=> style.Name[0]);
        if(styles.length>0) {
          let response_default = await service.get(`${Geoserver_host}/rest/layers/${workspace}:${encodeURIComponent(name)}.json`)
          list_active= {...list_active, [name]: response_default.layer.defaultStyle.name};
        }
        list_layers_styles.push({[name]:styles});
      });
      await Promise.all(promises);
      res.status(200).json({list: list_layers_styles, list_active: list_active});
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getStylesLayers");
    }
  }
  async getDatastores(_req: Request, res: Response) {
    try {
      let response = await service.get(`${Geoserver_host}/rest/workspaces/${workspace}/datastores.json`);
      res.status(200).json(response.dataStores?.dataStore?.map((store: any) => store.name));
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLayers");
    }
  }
  async getLayersDatastore(req: Request, res: Response) {
    switch(req.params.datastore) {
      case 'no_datastore':
        break;
      default:
        res.status(400).send("Error - getLayers: Invalid datastore");
        return;
    }
    try {
      let response = await service.get(`${Geoserver_host}/rest/workspaces/${workspace}/datastores/${req.params.datastore as string}/featuretypes.json`);
      let list_layers_group=response.featureTypes?.featureType?.map((layer: any) => layer.name);
      res.status(200).json(list_layers_group.length>0 ? list_layers_group : []);
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLayers");
    }
  }

  async getLayerFeatureTypes(name_layer: string): Promise<any> {
    try {
      let response2 = await service.get(`${Geoserver_host}/rest/layers/${workspace}:${encodeURIComponent(name_layer)}.json`);
      let datastore_layer=response2.layer.resource.href?.match(/datastores\/([^/]+)/)[1];
      let response = await service.get(`${Geoserver_host}/rest/workspaces/${workspace}/datastores/${datastore_layer}/featuretypes/${encodeURIComponent(name_layer)}.json`);
      return response;
    } catch (error) {
      console.error("Error ", error);
      throw new Error("Error - getLayerFeatureTypes");
    }
  }

  async getLayerWFS(req: Request, res: Response) {
    try {
      const { layer } = req.params;
      const bbox = req.query.bbox as string;
      const datastore = await getLayerDatastoreFromGeoserver(layer);
      let url = `${Geoserver_host}/${workspace}/ows?SERVICE=WFS&version=1.1.0&request=GetFeature&typeName=${datastore}:${layer}&outputformat=application/json`;
      if (bbox) {
        url += `&bbox=${bbox}`;
      }
      const response = await service.get(url);

      res.status(200).send(response);
      return response;
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLayerWFS");
    }
  }

  async getLayerWMS(req: Request, res: Response) {
    try {
      let response = await service.get(
        `${Geoserver_host}/${workspace}/ows?SERVICE=WMS&version=1.1.0/&request=GetMap&layers=${req.params.layer}&width=256&height=256&bbox=${req.query.bbox}&format=image/png`
      );
      res.set("Content-Type", "image/png");
      res.status(200).send(response.data);
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLayerWMS");
    }
  }

  async getLegendLayer(req: Request, res: Response) {
    try {
      let response = await service.getImage(
        `${Geoserver_host}/wms?REQUEST=GetLegendGraphic&version=1.0.0&format=image/png&width=25&height=25&&layer=${req.params.layer}`,
        { responseType: "arraybuffer" }
      );
      res.set("Content-Type", "image/png");
      res.set("Content-Length", response.data.length);
      res.status(200).send(response.data);
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getLegendLayer");
    }
  }

  async getAttributesLayer(req: Request, res: Response) {
    `
    ${Geoserver_host}/ows?
    REQUEST=GetFeatureInfo&QUERY_LAYERS=output_full_final
    &SERVICE=WMS&VERSION=1.3.0&FORMAT=application%2Fjson
    &STYLES=&TRANSPARENT=true
    &LAYERS=output_full_final
    &BBOX=0%2C0%2C5009377.085697311%2C5009377.085697311
    &CRS=EPSG%3A3857&TILED=true
    &INFO_FORMAT=application%2Fjson
    &Feature_count=50&I=19&J=1&WIDTH=256&HEIGHT=256
    `;
    try {
      let response = await service.get(
        `${Geoserver_host}/ows?&${req.body.params}`
      );
      res.status(200).json(response);
    } catch (error) {
      console.error("Error ", error);
      res.status(500).send("Error - getAttributesLayer");
    }
  }

  async putStyleGeoserver(name_style: string,title_style: string,dir_path: string,module: TypeModule,type_ES_Attribute:TypeTotalEcosystemService= TypeTotalEcosystemService.none) {
    try {
      let content = content_style(name_style, title_style, module, type_ES_Attribute);
      fs.writeFileSync(path.join(dir_path, name_style + ".sld"), content);
      await exec(
        `curl -v -u ${Geoserver_user}:${Geoserver_pass} -XPOST -H "Content-type: application/vnd.ogc.sld+xml" -d @${path.join(
          dir_path,
          name_style + ".sld"
        )} ${Geoserver_host}/rest/styles?name=${title_style}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error: ${error}`);
            return;
          }
          if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          const filePath = path.join(dir_path, name_style + ".sld");
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`Archivo ${name_style}.sld eliminado correctamente.`);
            } catch (unlinkError) {
              console.error(`Error al eliminar el archivo ${name_style}.sld:`, unlinkError);
            }
          }
        }
      )
    } catch (error) {
      console.error("Error ", error);
      throw new Error("Error - putStyleGeoserver");
    }
  }
  async checkExistStyle(name_style: string): Promise<boolean> {
    try {
      let response = await service.get(
        `${Geoserver_host}/rest/styles/${name_style}.json`
      );
      return response.style ? true : false;
    } catch (error) {
      return false;
    }
  }
  async setStyleLayerGeoserver(name_layer:string, name_style:string, name_style_others:string[]=[]){
    let content=`{"layer": {"defaultStyle": {"name": "${name_style}"}`;
    if(name_style_others.length !== 0){
      const list_names = name_style_others.map(name => `{"name":"${name}"}`).join(", ");
      content+=`,
      "styles": {
        "style": [${list_names}]
      }`;
    }
    content+=`}}`;
    try {
      await service.put(`${Geoserver_host}/rest/layers/${workspace}:${encodeURIComponent(name_layer)}.json`, content);
      return;
    } catch (error) {
      console.error("Error ", error);
      throw new Error("Error - setStyleLayerGeoserver");
    }
  }

  async putLayerGeoserver( name_layer: string, name_file:string, _name_style: string, _title_style: string, dir_path: string, typeModule: TypeModule=TypeModule.msp, tokenCreated: boolean = false ) {
  
    
    let file = path.join( dir_path, name_file.includes(".geojson") ? name_file : name_file + ".geojson" );
    let data = fs.readFileSync(file, "utf8");
    const layer = JSON.parse(data);
    let response;
    if(!tokenCreated){
      let template_layer = template_layer_feature_type( name_layer, layer.features[0].geometry.type, getDataStore(typeModule), layer.features[0].properties );
      console.log("template_layer ----> ", JSON.stringify(template_layer));
      console.log("data_",getDataStore(typeModule));
      response = await service.post( `${Geoserver_host}/rest/workspaces/${workspace}/datastores/${getDataStore(typeModule)}/featuretypes`,
        template_layer,
        {
          "Content-Type": "application/json",
        }
      );
    }else{
      response = {status: 200};
    }
    try {
      if (response.status == 500) {
        throw new Error(`Error - post of put featureType - ${response.message}`);
      }
      let schema = typeModule == TypeModule.msp ? listSchemas_BD[0] :
                   typeModule == TypeModule.lsi ? listSchemas_BD[1] :
                   listSchemas_BD[2];
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const waitForTable = async (name_layer: string, schema: string, timeoutMs = 5 * 60 * 1000, intervalMs = 30000) =>{
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          try {
            const exists = await postgis.checkExistTableDB(name_layer, schema);
            if (exists) return true;
          } catch (err) {
            console.warn('Error comprobando tabla, reintentando...', err);
          }
          await sleep(intervalMs);
        }
        return false;
      }
      const tableReady = await waitForTable(name_layer, schema, 5 * 60 * 1000, 5000);
             
      let postgis = new PostgisService();
      if(tableReady){
        console.log(`ℹ️ La tabla ${name_layer} ya existe en el esquema ${schema}. Actualizando datos...}`);
        await postgis.putDataLayer( layer, name_layer.includes(".geojson") ? name_layer.split(".")[0] : name_layer, typeModule as TypeModule, schema);
      }else{
        throw new Error(`Timeout: La tabla ${name_layer} no se creó en el esquema ${schema} dentro del tiempo esperado.`);
      }
    } catch (error) {
      console.error("Error ", error);
      throw new Error("Error - putLayerGeoserver");
    } finally {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`Archivo ${name_layer} eliminado correctamente.`);
        } catch (unlinkError) {
          console.error(
            `Error al eliminar el archivo ${name_layer}:`,
            unlinkError
          );
        }
      }
    }
  }
  async fetchLayerData(
    layerName: string,
    name_datastore: string = datastore
  ): Promise<any> {
    try {
      const url = `${Geoserver_host}/${workspace}/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=${name_datastore}:${layerName}&outputFormat=application/json`;
      const response = await service.get(url);
      return response;
    } catch (error) {
      throw new Error(`Error fetching layer: ${layerName}`);
    }
  }

  async getLayerDatastore(req: Request, res: Response) {
    try {
      const { layer } = req.params;
      const response = await service.get(
        `${Geoserver_host}/rest/workspaces/${workspace}/layers/${layer}.json`
      );

      const resourceHref = response.layer.resource.href;
      const datastoreMatch = resourceHref.match(/datastores\/([^/]+)/);
      const datastore = datastoreMatch ? datastoreMatch[1] : "unknown";

      res.status(200).json({ datastore });
    } catch (error) {
      console.error("Error fetching datastore:", error);
      res.status(500).json({ error: "Error al obtener el datastore" });
    }
  }
  
  async downloadShapefile(req: Request, res: Response) {
    try {
      const { name_layer } = req.params;
      const geoServerUrl = `${Geoserver_host}/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${workspace}:${name_layer}&outputFormat=shape-zip`;
      const response = await axios.get(geoServerUrl, {
        responseType: "stream",
        auth: {
          username: Geoserver_user,
          password: Geoserver_pass,
        },
      });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${name_layer}.zip`
      );
      response.data.pipe(res);
    } catch (error) {
      console.error("Error downloading shapefile:", error);
      res.status(500).send("Error downloading shapefile");
    }
  }
}

function content_style(name_style: string, title_style: string, module: TypeModule, type_ES_Attribute:TypeTotalEcosystemService= TypeTotalEcosystemService.none) {
  let content_file = `<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0" 
xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" 
xmlns="http://www.opengis.net/sld" 
xmlns:ogc="http://www.opengis.net/ogc" 
xmlns:xlink="http://www.w3.org/1999/xlink" 
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<NamedLayer>
  <Name>${name_style}</Name>
  <UserStyle>
      <Name>${name_style}</Name>
      <Title>${title_style}</Title>`;
  if (module == TypeModule.msp) {
    Object.values(Values).forEach((valueItem) => {
      content_file += `<FeatureTypeStyle>
            <Rule>
            <Name>${valueItem}</Name>
            <ogc:Filter>
                <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>color</ogc:PropertyName>
                <ogc:Literal>${valueItem}</ogc:Literal>
                </ogc:PropertyIsEqualTo>
            </ogc:Filter>
            <PolygonSymbolizer>
                <Fill>
                <CssParameter name="fill">${Color[valueItem]}</CssParameter>
                </Fill>
            </PolygonSymbolizer>
            </Rule>
        </FeatureTypeStyle>
        `;
    });
  } else if(module == TypeModule.lsi) {
    Object.values(Values_Lsi).forEach((valueItem) => {
      content_file += `<FeatureTypeStyle>
          <Rule>
          <Name>${valueItem}</Name>
          <ogc:Filter>
              <ogc:PropertyIsEqualTo>
              <ogc:PropertyName>type_buffer</ogc:PropertyName>
              <ogc:Literal>${valueItem}</ogc:Literal>
              </ogc:PropertyIsEqualTo>
          </ogc:Filter>
          <PolygonSymbolizer>
              <Fill>
              <CssParameter name="fill">${Color_Lsi[valueItem]}</CssParameter>
              </Fill>
          </PolygonSymbolizer>
          </Rule>
      </FeatureTypeStyle>
      `;
    });
  }else{
    let ranges:any[]=[];
    if(
      type_ES_Attribute === TypeTotalEcosystemService.total ||
      type_ES_Attribute === TypeTotalEcosystemService.provisioning  ||
      type_ES_Attribute === TypeTotalEcosystemService.regulation  ||
      type_ES_Attribute === TypeTotalEcosystemService.cultural
    ) {
      ranges = ScaleTypeES[type_ES_Attribute];
    }
    content_file += `<FeatureTypeStyle>`;
    ranges.forEach(r => {
      content_file += `
        <Rule>
          <Name>${r.min}-${r.max - 1}</Name>
          <ogc:Filter>
            <ogc:And>
              <ogc:PropertyIsGreaterThanOrEqualTo>
                <ogc:PropertyName>total_ecosystemservices</ogc:PropertyName>
                <ogc:Literal>${r.min}</ogc:Literal>
              </ogc:PropertyIsGreaterThanOrEqualTo>
              <ogc:PropertyIsLessThan>
                <ogc:PropertyName>${type_ES_Attribute}</ogc:PropertyName>
                <ogc:Literal>${r.max}</ogc:Literal>
              </ogc:PropertyIsLessThan>
            </ogc:And>
          </ogc:Filter>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">${r.color}</CssParameter>
            </Fill>
          </PolygonSymbolizer>
        </Rule>
      `;
    });
    content_file += `</FeatureTypeStyle>`;
  }
  content_file += `
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>
    `;
  return content_file;
}
function template_layer_feature_type( name_layer: string, type: string, name_datastore: string = datastore, properties: any={}) {
  let typeGeometry = TypeGeom[type as keyof typeof TypeGeom];
  const getListAttributes = () => {
    const attributesList = [];
    for (const key in properties) {
      if (key === "geom") continue;
      let ob= {
        name: key, 
        minOccurs: 0,
        maxOccurs: 1,
        nillable: true,
      }
      if (key === "fid1" || key === "fid2"){
        attributesList.push({
          ...ob,
          binding: TypeAttribute.interger,
        });
        continue;
      };
      if( key === "designation" || key === "seausefct" || key === "hilucsmsp" || key === "originunen" || key === "color"){
        attributesList.push({
          ...ob,
          binding: TypeAttribute.string,
        });
        continue;
      }

      const value = properties[key];
      let bindingType;
      switch (typeof value) {
        case "number":  
        case "string":
        case "boolean":
        default:
          bindingType = TypeAttribute.string;
      }
      attributesList.push({
        ...ob,
        binding: bindingType,
      });
    }
    return attributesList;
  };
  let attributes = getListAttributes();
  return {
    featureType: {
      name: name_layer,
      nativeName: name_layer,
      namespace: {
        name: workspace,
        href: `${Geoserver_host}/geoserver/rest/namespaces/${workspace}.json`,
      },
      title: name_layer,
      abstract: "",
      metadataLinks: {},
      dataLinks: {},
      nativeCRS:
        'GEOGCS["WGS 84", \n  DATUM["World Geodetic System 1984", \n    SPHEROID["WGS 84", 6378137.0, 298.257223563, AUTHORITY["EPSG","7030"]], \n    AUTHORITY["EPSG","6326"]], \n  PRIMEM["Greenwich", 0.0, AUTHORITY["EPSG","8901"]], \n  UNIT["degree", 0.017453292519943295], \n  AXIS["Geodetic longitude", EAST], \n  AXIS["Geodetic latitude", NORTH], \n  AUTHORITY["EPSG","4326"]]',
      srs: "EPSG:4326",
      nativeBoundingBox: { minx: -180, maxx: 180, miny: -90, maxy: 90, crs: "EPSG:4326",},
      latLonBoundingBox: { minx: -180, maxx: 180, miny: -90, maxy: 90, crs: "EPSG:4326", },
      store: {
        "@class": "dataStore",
        name: `${workspace}:${name_datastore}`,
        href: `http://localhost:8080/geoserver/rest/workspaces/${workspace}/datastores/${name_datastore}.json`,
      },
      maxFeatures: 100,
      numDecimals: 6,
      responseSRS: {
        string: [4326],
      },
      overridingServiceSRS: true,
      skipNumberMatched: true,
      circularArcPresent: true,
      linearizationTolerance: 10,
      attributes: {
        attribute: [
          {
            name: "geom",
            minOccurs: 0,
            maxOccurs: 1,
            nillable: true,
            binding: typeGeometry,
          },
          ...attributes
        ],
      },
    },
  };
}

const getDataStore = (nameModule: string) => {
  switch (nameModule) {
    case TypeModule.msp:
      return listDatastoresResults[0]
    case TypeModule.lsi:
      return listDatastoresResults[1];
    case TypeModule.es:
      return listDatastoresResults[2];
    default:
      return datastore;
  }
};
const getLayerDatastoreFromGeoserver = async (
  layerName: string
): Promise<string> => {
  try {
    const response = await service.get(
      `${Geoserver_host}/rest/workspaces/${workspace}/layers/${layerName}.json`
    );

    const resourceHref = response.layer.resource.href;
    const match = resourceHref.match(/datastores\/([^/]+)/);
    return match ? match[1] : "unknown";
  } catch (error) {
    console.error("Error fetching datastore:", error);
    return "unknown";
  }
};