// To parse this data:
//
//   import { Convert } from "./file";
//
//   const clinicinjectionRecordPost = Convert.toClinicinjectionRecordPost(json);

export interface ClinicinjectionRecordPost {
    oldAppointmentAid: number | null;
    nextAppointmentAid: number | null;
    clinicEmail:        string;
    doctorCareerNo:     string;
    vaccine:            string;
    date:               Date;
    vaccine_label:      string;
    type:               number;
}

// Converts JSON strings to/from your types
export class Convert {
    public static toClinicinjectionRecordPost(json: string): ClinicinjectionRecordPost[] {
        return JSON.parse(json);
    }

    public static clinicinjectionRecordPostToJson(value: ClinicinjectionRecordPost[]): string {
        return JSON.stringify(value);
    }
}
