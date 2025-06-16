// To parse this data:
//
//   import { Convert, OtpPost } from "./file";
//
//   const otpPost = Convert.toOtpPost(json);

export interface OtpPost {
    user_email: string;
    otp:        string;
    expire:     string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toOtpPost(json: string): OtpPost {
        return JSON.parse(json);
    }

    public static otpPostToJson(value: OtpPost): string {
        return JSON.stringify(value);
    }
}
