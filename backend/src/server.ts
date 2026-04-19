import dotenv from "dotenv";
import { app } from "./app";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });
}
