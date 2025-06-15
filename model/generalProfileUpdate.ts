// To parse this data:
//
//   import { Convert, GeneralEditProfilePost } from "./file";
//
//   const generalEditProfilePost = Convert.toGeneralEditProfilePost(json);

export interface GeneralEditProfilePost {
    user_email: string;
    username:   string;
    name:       string;
    surname:    string;
    phone:      string;
    address:    string;
    image:      string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toGeneralEditProfilePost(json: string): GeneralEditProfilePost {
        return JSON.parse(json);
    }

    public static generalEditProfilePostToJson(value: GeneralEditProfilePost): string {
        return JSON.stringify(value);
    }
}
