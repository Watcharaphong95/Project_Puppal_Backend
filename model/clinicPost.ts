// To parse this data:
//
//   import { Convert, ClinicPost } from "./file";
//
//   const clinicPost = Convert.toClinicPost(json);

export interface ClinicPost {
    user_email: string;
    name:       string;
    phone:      string;
    address:    string;
    lat:        string;
    lng:        string;
    image:      string;
    open:       string;
    close:      string;
    numPerTime: number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicPost(json: string): ClinicPost {
        return JSON.parse(json);
    }

    public static clinicPostToJson(value: ClinicPost): string {
        return JSON.stringify(value);
    }
}
