import 'dotenv/config';
import express from "express";
import { router as index} from "./api/index";
import { router as user} from "./api/user";
import { router as general} from "./api/general";
import { router as clinic} from "./api/clinic";
import { router as doctor} from "./api/doctor";
import { router as dog} from "./api/dog";
import { router as injectionRecord} from "./api/dogInjectionRecord";
import { router as special } from "./api/special";
import { router as reserve} from "./api/reserve";
import { router as doctorspecial } from "./api/docspecial";
import { router as vaccine } from "./api/vaccine";
import { router as appointment } from "./api/appointment";
import { router as cilnicinjectionRecord} from "./api/clinicinjectionRecord"
import { router as notify} from "./api/notify"
import bodyParser from "body-parser";
import { router as schedule } from "./api/schedule"        ;


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
app.use("/reserve", reserve);
app.use("/docspecial", doctorspecial);
app.use("/vaccine", vaccine);
app.use("/appointment", appointment);
app.use("/clinicinjectionRecord", cilnicinjectionRecord);
app.use("/schedule", schedule);
app.use("/notify", notify);