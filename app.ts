import express from "express";
import { router as index} from "./api/index";
import { router as user} from "./api/user";
import { router as general} from "./api/general";
import { router as clinic} from "./api/clinic";
import { router as doctor} from "./api/clinic/doctor";
import { router as dog} from "./api/dog";
import { router as injectionRecord} from "./api/dogInjectionRecord";
import { router as special } from "./api/clinic/special";
import bodyParser from "body-parser";

export const app = express();

app.use(bodyParser.text());
app.use(bodyParser.json());
app.use("/index", index);
app.use("/user", user);
app.use("/general", general);
app.use("/clinic", clinic);
app.use("/doctor", doctor);
app.use("/dog", dog);
app.use("/injectionRecord", injectionRecord);
app.use("/special", special);