import { Request, Response } from "express";
import s3Service from "../services/awsS3";
import { deliveryEmail } from "../services/email";

interface ShareRequest {
  email: string;
  hash: string;
  filename: string;
}

export const processAndShareFile = async (req: Request, res: Response) => {
  try {
    const { email, hash, filename }: ShareRequest = req.body;
    if (!email || !hash || !filename) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const fileStream = await s3Service.downloadOutputFile({
      hash,
      filename,
    });

    const fileBuffer = await streamToBuffer(fileStream);

    const presignedUrl = await s3Service.uploadAndGetShareableUrl({
      fileBuffer,
      filename: `${hash}_${filename}`,
    });

    const emailSubject = "Your ReMAP offline intersections are ready!";
    const emailBody = `
        <h1>ReMAP Intersection Complete</h1>
        <p>Here is your download link for the complete intersection of the selected layers:</p>
        <a href="${presignedUrl}" target="_blank">Download Results</a>
        <p>This link will expire in 7 days.</p>
        <p>Best regards,<br/>The ReMAP Team</p>
    `;
    await deliveryEmail(email, emailSubject, emailBody);
    res.json({
      success: true,
      message: "File shared successfully and notification email sent",
    });
  } catch (error) {
    console.error("Sharing error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to process file sharing",
    });
  }
};

const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};
