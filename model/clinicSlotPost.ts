// To parse this data:
//
//   import { Convert, ClinicSlotPost } from "./file";
//
//   const clinicSlotPost = Convert.toClinicSlotPost(json);

export interface ClinicSlotPost {
    email: string;
    clinicEmail: string;
    date:  string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSlotPost(json: string): ClinicSlotPost {
        return JSON.parse(json);
    }

    public static clinicSlotPostToJson(value: ClinicSlotPost): string {
        return JSON.stringify(value);
    }
}
