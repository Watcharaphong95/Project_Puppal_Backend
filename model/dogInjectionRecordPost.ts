// To parse this data:
//
//   import { Convert, InjectionRecordPost } from "./file";
//
//   const injectionRecordPost = Convert.toInjectionRecordPost(json);

export interface InjectionRecordPost {
    rid:                number;
    dog_Id:             number;
    clinic_user_email:  string;
    general_user_email: string;
    clinicName:         null;
    vaccine:            string;
    date:               string;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toInjectionRecordPost(json: string): InjectionRecordPost {
        return JSON.parse(json);
    }

    public static injectionRecordPostToJson(value: InjectionRecordPost): string {
        return JSON.stringify(value);
    }
}
