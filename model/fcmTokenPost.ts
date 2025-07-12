// To parse this data:
//
//   import { Convert, FcmTokenPost } from "./file";
//
//   const fcmTokenPost = Convert.toFcmTokenPost(json);

export interface FcmTokenPost {
    user_email: string;
    fcmToken:   string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toFcmTokenPost(json: string): FcmTokenPost {
        return JSON.parse(json);
    }

    public static fcmTokenPostToJson(value: FcmTokenPost): string {
        return JSON.stringify(value);
    }
}
