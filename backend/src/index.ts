import express from "express";
import cors from "cors";
import router from "./routes";

const app = express();

// Middleware para parsear el body de las solicitudes POST
if (process.env.NODE_ENV === 'production') {
  console.log('mode production')
app.use(cors({
  origin: 'https://domain'
}));
} else {
  app.use(cors());
}
app.use(express.json());
// Iniciar el servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
app.use((req, _res, next) => {
  //Middleware    **
  console.log("*************************************************************");
  console.log(`Route: ${req.baseUrl} Método: ${req.path} `);
  console.log(`Método: ${req.method} `);
  next();
});
// Rutas
app.use("/", router);
app.use("/status", (_, res) => {
  res.json({ status: "ok" });
});
