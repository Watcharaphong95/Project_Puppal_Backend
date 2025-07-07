// To parse this data:
//
//   import { Convert, ClinicSlotGet } from "./file";
//
//   const clinicSlotGet = Convert.toClinicSlotGet(json);

export interface ClinicSlotGet {
    open:       string;
    close:      string;
    numPerTime: number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSlotGet(json: string): ClinicSlotGet {
        return JSON.parse(json);
    }

    public static clinicSlotGetToJson(value: ClinicSlotGet): string {
        return JSON.stringify(value);
    }
}
