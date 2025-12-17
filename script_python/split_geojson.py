#!/usr/bin/env python3
import fiona
import os
import sys
import json

FEATURES_PER_FILE = 50000 # fijo
OUTPUT_DIR = "gpkg_split"

def split_gpkg_streaming(input_file, layer_name):
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with fiona.open(input_file, layer=layer_name) as src:
        schema = src.schema
        crs = src.crs

        features = []
        file_count = 1

        for feature in src:
            features.append(feature)

            if len(features) >= FEATURES_PER_FILE:
                save_chunk(features, schema, crs, layer_name, file_count)
                file_count += 1
                features = []

        # Guardar lo que quede
        if features:
            save_chunk(features, schema, crs, layer_name, file_count)

def save_chunk(features, schema, crs, layer_name, file_count):
    output_path = os.path.join(OUTPUT_DIR, f"{layer_name}_part{file_count}.geojson")
    with fiona.open(output_path, 'w', driver="GeoJSON", schema=schema, crs=crs) as dst:
        dst.writerecords(features)
    print(f"✅ Guardado {output_path} ({len(features)} features)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python split_gpkg.py <fichero.gpkg> [nombre_capa]")
        sys.exit(1)

    input_file = sys.argv[1]

    if not os.path.exists(input_file):
        print(f"❌ El archivo '{input_file}' no existe.")
        sys.exit(1)

    if len(sys.argv) == 2:
        print("Capas disponibles en el GeoPackage:")
        for layer in fiona.listlayers(input_file):
            print(f" - {layer}")
        print("\nVuelve a ejecutar especificando una de estas capas.")
        sys.exit(0)
    else:
        layer_name = sys.argv[2]
        split_gpkg_streaming(input_file, layer_name)






# #!/usr/bin/env python3
# import ijson
# import json
# import sys
# import os
# from decimal import Decimal

# # 📌 Configuración
# FEATURES_PER_FILE = 15000  # cantidad fija de features por archivo

# def convert_decimals(obj):
#     """
#     Convierte recursivamente los Decimal a float.
#     """
#     if isinstance(obj, list):
#         return [convert_decimals(i) for i in obj]
#     elif isinstance(obj, dict):
#         return {k: convert_decimals(v) for k, v in obj.items()}
#     elif isinstance(obj, Decimal):
#         return float(obj)
#     return obj

# def split_geojson(input_file):
#     base_name = os.path.splitext(os.path.basename(input_file))[0]
#     output_dir = f"{base_name}_split"
#     os.makedirs(output_dir, exist_ok=True)

#     with open(input_file, 'rb') as f:
#         features = ijson.items(f, 'features.item')

#         chunk = []
#         file_count = 1
#         for feature in features:
#             chunk.append(feature)
#             if len(chunk) >= FEATURES_PER_FILE:
#                 output_path = os.path.join(output_dir, f"{base_name}_part{file_count}.geojson")
#                 save_chunk(chunk, output_path)
#                 print(f"✅ Guardado: {output_path}")
#                 file_count += 1
#                 chunk = []

#         if chunk:
#             output_path = os.path.join(output_dir, f"{base_name}_part{file_count}.geojson")
#             save_chunk(chunk, output_path)
#             print(f"✅ Guardado: {output_path}")

# def save_chunk(features, output_path):
#     geojson_obj = {
#         "type": "FeatureCollection",
#         "features": convert_decimals(features)
#     }
#     with open(output_path, 'w', encoding='utf-8') as out_f:
#         json.dump(geojson_obj, out_f, ensure_ascii=False)

# if __name__ == "__main__":
#     if len(sys.argv) != 2:
#         print("Uso: python split_geojson.py <input.geojson>")
#         sys.exit(1)

#     input_file = sys.argv[1]
#     split_geojson(input_file)
