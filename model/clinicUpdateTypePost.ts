// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicUpdateTypePost = Convert.toClinicUpdateTypePost(json);

export interface ClinicUpdateTypePost {
    reserveID: number;
    type:      number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicUpdateTypePost(json: string): ClinicUpdateTypePost[] {
        return JSON.parse(json);
    }

    public static clinicUpdateTypePostToJson(value: ClinicUpdateTypePost[]): string {
        return JSON.stringify(value);
    }
}
