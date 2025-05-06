// To parse this data:
//
//   import { Convert, InjectionRecordPost } from "./file";
//
//   const injectionRecordPost = Convert.toInjectionRecordPost(json);

export interface InjectionRecordPost {
    dog_Id:      number;
    clinicName:  string;
    vaccineType: string;
    date:        string;
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
