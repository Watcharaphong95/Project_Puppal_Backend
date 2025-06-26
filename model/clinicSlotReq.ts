// To parse this data:
//
//   import { Convert, ClinicSlotReq } from "./file";
//
//   const clinicSlotReq = Convert.toClinicSlotReq(json);

export interface ClinicSlotReq {
    general_email: string;
    clinic_email:  string;
    dog_dogId:     number;
    date:          string;
    status:        number;
    typeVaccine:   string;
    type:          number;
    message:       null;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSlotReq(json: string): ClinicSlotReq {
        return JSON.parse(json);
    }

    public static clinicSlotReqToJson(value: ClinicSlotReq): string {
        return JSON.stringify(value);
    }
}
