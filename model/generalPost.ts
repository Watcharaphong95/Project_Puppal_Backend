// To parse this data:
//
//   import { Convert, GeneralPost } from "./file";
//
//   const generalPost = Convert.toGeneralPost(json);

export interface GeneralPost {
    user_email: string;
    username:   string;
    name:       string;
    surname:    string;
    phone:      string;
    address:    string;
    lat:        string;
    lng:        string;
    image:      string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toGeneralPost(json: string): GeneralPost {
        return JSON.parse(json);
    }

    public static generalPostToJson(value: GeneralPost): string {
        return JSON.stringify(value);
    }
}
