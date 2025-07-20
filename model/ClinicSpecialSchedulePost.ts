// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicSpecialSchedulePost = Convert.toClinicSpecialSchedulePost(json);

export interface ClinicSpecialSchedulePost {
    clinic_email:        string;
    date:                Date;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicSpecialSchedulePost(json: string): ClinicSpecialSchedulePost[] {
        return JSON.parse(json);
    }

    public static clinicSpecialSchedulePostToJson(value: ClinicSpecialSchedulePost[]): string {
        return JSON.stringify(value);
    }
}
