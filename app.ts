import express from "express";
import { router as user} from "./api/user";
import { router as general} from "./api/general";
import { router as clinic} from "./api/clinic";
import { router as doctor} from "./api/doctor";
import bodyParser from "body-parser";

export const app = express();

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use("/user", user);
app.use("/general", general);
app.use("/clinic", clinic);
app.use("/doctor", doctor);