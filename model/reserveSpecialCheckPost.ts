// To parse this data:
//
//   import { Convert, ReserveSpecialCheckPost } from "./file";
//
//   const reserveSpecialCheckPost = Convert.toClinicSlotPost(json);

export interface ReserveSpecialCheckPost {
    clinic_email: string;
    general_email: string;
    date:  string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toReserveSpecialCheckPost(json: string): ReserveSpecialCheckPost {
        return JSON.parse(json);
    }

    public static reserveSpecialCheckPost(value: ReserveSpecialCheckPost): string {
        return JSON.stringify(value);
    }
}
