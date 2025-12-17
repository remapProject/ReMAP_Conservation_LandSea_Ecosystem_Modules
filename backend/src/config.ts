import dotenv from 'dotenv';
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: `./${envFile}` });
console.log('Entorno:', process.env.NODE_ENV);
console.log('Puerto:', process.env.PORT);
console.log('domain:', process.env.GEOSERVER_HOST)
export const eHilucs_host = process.env.EHILUCS_HOST;
export const Geoserver_host = process.env.GEOSERVER_HOST || 'http://localhost:8080/geoserver';
export const Geoserver_user = process.env.USERNAME_GEOSERVER!;
export const Geoserver_pass = process.env.PASS_GEOSERVER!;
export const {
    AWS_REGION = "region",
    AWS_SES_ACCESS_KEY_ID = "",
    AWS_SES_SECRET_ACCESS_KEY = "",
    AWS_SES_EMAIL = "",
    JWT_SECRET = "",
} = process.env;

export const ADMIN_USER = process.env.ADMIN_USER;
export const ADMIN_PASS = process.env.ADMIN_PASS;
export const AWS_S3_ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID || AWS_SES_ACCESS_KEY_ID;
export const AWS_S3_SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY || AWS_SES_SECRET_ACCESS_KEY;

export const Postgresql_host = process.env.POSTGRESQL_HOST!;
export const Postgresql_db = process.env.DATABASE!;
export const Postgresql_port = process.env.PORT_POSTGRESQL!;
export const Postgresql_user = process.env.USERNAME_POSTGRESQL!;
export const Postgresql_pass = process.env.PASS_POSTGRESQL!;
