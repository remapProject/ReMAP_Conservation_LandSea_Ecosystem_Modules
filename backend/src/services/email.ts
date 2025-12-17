import * as aws from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";
import {
  AWS_REGION,
  AWS_SES_EMAIL,
  AWS_SES_ACCESS_KEY_ID,
  AWS_SES_SECRET_ACCESS_KEY,
} from "../config";

const ses = new aws.SES({
  apiVersion: "VERSION",
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: AWS_SES_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { ses, aws },
  sendingRate: 1,
  maxConnections: 1,
});

export const deliveryEmail = async (
  toAddress: string,
  subject: string,
  emailBody: string
) => {
  return new Promise(async (resolve, reject) => {
    transporter.sendMail(
      {
        from: `"ReMAP Team" <${AWS_SES_EMAIL}>`,
        to: toAddress,
        subject: subject,
        html: emailBody,
      },
      (err, info) => {
        transporter.close();
        if (err) {
          console.error("Error sending email: ", err);
          reject(err);
        } else {
          console.log("Email sent: ", info);
          resolve(info);
        }
      }
    );
  });
};
