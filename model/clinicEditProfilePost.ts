// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicEditProfilePost = Convert.toClinicEditProfilePost(json);

export interface ClinicEditProfilePost {
    name:       string;
    phone:      string;
    address:    string;
    lat:        string;
    lng:        string;
    image:      string;
    numPerTime: number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicEditProfilePost(json: string): ClinicEditProfilePost[] {
        return JSON.parse(json);
    }

    public static clinicEditProfilePostToJson(value: ClinicEditProfilePost[]): string {
        return JSON.stringify(value);
    }
}
