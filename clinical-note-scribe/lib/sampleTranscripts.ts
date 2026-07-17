import type { TranscriptInput } from "./types";

export interface SampleTranscript extends TranscriptInput {
  name: string;
  description: string;
}

/** Four fictional doctor-patient dialogues of increasing complexity.
 * No real patients — all names and details invented. */
export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    name: "Routine Check-up",
    description: "Healthy adult, annual physical",
    transcript: `Doctor: Good morning! Here for your annual physical, right? How have you been feeling?
Patient: Morning, doctor. Yeah, just the yearly check. Honestly I feel fine. Work's been busy but nothing health-wise.
Doctor: Any changes since last year? Weight, sleep, energy?
Patient: Sleep's decent, maybe six and a half hours. Weight's about the same. I did start jogging twice a week in March.
Doctor: That's great. Any chest pain, shortness of breath, palpitations with the jogging?
Patient: No, nothing like that. Maybe a little winded on hills but it passes.
Doctor: Headaches, dizziness, vision changes?
Patient: No.
Doctor: Any stomach issues, changes in bowel habits?
Patient: No, all normal.
Doctor: Alcohol, smoking?
Patient: A glass of wine on weekends. Never smoked.
Doctor: Perfect. Let's have a look. Blood pressure today is 118 over 76, pulse is 64. Heart sounds regular, no murmur. Lungs are clear. Abdomen soft, non-tender. Reflexes normal.
Patient: All good then?
Doctor: Everything looks healthy. Your labs from last week came back too — total cholesterol 172, fasting glucose 88, both well within range.
Patient: Great, my dad has diabetes so I always worry about the sugar.
Doctor: With a fasting glucose of 88 you're in good shape, and it's smart to keep an eye on it given the family history. Keep up the jogging, aim for seven hours of sleep if you can.
Patient: Will do.
Doctor: I'd like to see you again in a year for the next annual. If anything comes up before then — chest pain, unexplained weight change — come in sooner.
Patient: Sounds good. Thanks, doctor.`,
  },
  {
    name: "Acute Complaint",
    description: "Chest pain, urgent, differentials needed",
    transcript: `Doctor: I understand you're having chest pain. Tell me what's going on.
Patient: It started about two hours ago. A pressure, right in the middle of my chest. It comes and goes — bad for a few minutes, then eases off.
Doctor: On a scale of one to ten at its worst?
Patient: Maybe a seven. Right now it's a three.
Doctor: Does it move anywhere — your arm, jaw, back?
Patient: This morning it went up toward my jaw once, briefly.
Doctor: Any sweating, nausea, shortness of breath?
Patient: I felt sweaty when it was bad, and a bit short of breath climbing the stairs to the clinic.
Doctor: What were you doing when it started?
Patient: Carrying groceries up to my apartment. Third floor.
Doctor: Has anything like this happened before?
Patient: Little twinges the past couple of weeks when I rush, but nothing this long.
Doctor: Do you smoke? Any blood pressure or cholesterol problems?
Patient: I smoke about half a pack a day, have for twenty years. My blood pressure was borderline last year but I never followed up.
Doctor: Any heart disease in the family?
Patient: My father had a heart attack at fifty-eight.
Doctor: Alright. Your blood pressure here is 152 over 94, pulse 92, oxygen saturation 97 percent. Heart sounds are regular, lungs clear. The chest wall isn't tender to pressure, which makes a muscular cause less likely.
Patient: Is it my heart?
Doctor: I'm concerned enough to treat it that way until proven otherwise. This pattern — exertional pressure, radiation to the jaw, your smoking history and family history — could be unstable angina, and I can't rule out a heart attack without tests. It could also be reflux or a muscle strain, but we don't guess with this picture.
Patient: Okay. What now?
Doctor: We're doing an ECG right now and sending troponin bloodwork, and I'm giving you 325 milligrams of aspirin to chew now. I'm arranging transfer to the emergency department for monitoring and serial testing. Don't drive yourself.
Patient: That's scary, but okay.
Doctor: If the pain becomes severe, or you feel faint or very short of breath while we wait, tell the nurse immediately.`,
  },
  {
    name: "Chronic Management",
    description: "Diabetes follow-up, medication adjustment",
    patient_context: {
      age: 61,
      sex: "female",
      known_conditions: ["type 2 diabetes mellitus", "hypertension"],
      current_medications: ["metformin 1000 mg twice daily", "lisinopril 10 mg daily"],
    },
    transcript: `Doctor: Good to see you again. It's been three months — how's the diabetes routine going?
Patient: Mostly okay. I check my sugar most mornings. It's usually between 140 and 160.
Doctor: And you're taking the metformin twice a day as prescribed?
Patient: Yes, with breakfast and dinner. Though the stomach upset never fully went away.
Doctor: Noted. Your lab results from Tuesday: your A1C is 8.1 percent. Three months ago it was 7.6, so we've drifted the wrong direction. Kidney function is stable and normal. Cholesterol panel looks fine on the current regimen.
Patient: I was worried about that. My daughter's wedding, all the events... my eating hasn't been great.
Doctor: Life happens. How is the blood pressure medication going — any dizziness, cough?
Patient: No, none.
Doctor: Your pressure today is 128 over 78, which is right where we want it. Weight is up two kilos from last visit, at 82.
Patient: The wedding cake has a lot to answer for.
Doctor: Here's what I'd like to do. We keep metformin at 1000 twice daily, and I'm adding empagliflozin 10 milligrams once each morning. It lowers sugar, helps a bit with weight, and protects the kidneys.
Patient: Any side effects I should watch for?
Doctor: The main ones are urinary tract and yeast infections because it works through the urine — stay well hydrated, and call us if you get burning or unusual discharge. Rarely, dizziness. Take it in the morning.
Patient: Alright.
Doctor: Any numbness or tingling in your feet? Vision changes?
Patient: My feet are fine. I'm due for my eye exam though.
Doctor: Please book the retinal screening this month — it's been over a year. I also want a repeat A1C and kidney panel in three months, and we'll meet right after those results.
Patient: Three months, labs first. Got it.
Doctor: And aim for a 20-minute walk five days a week — it moves that A1C more than people expect.`,
  },
  {
    name: "Pediatric Visit",
    description: "Recurrent ear infections, parent reporting",
    patient_context: {
      age: 4,
      sex: "male",
      known_conditions: [],
      current_medications: [],
    },
    transcript: `Doctor: So this is Sam, and you're worried about his ears again?
Parent: Yes. This is the third ear infection since October. He started tugging his right ear two days ago, and last night he woke up crying twice saying it hurt.
Doctor: Any fever?
Parent: 38.6 last night by the forehead thermometer. This morning it was 37.9 after children's paracetamol.
Doctor: How's his eating and drinking?
Parent: Drinking okay, eating less than usual. And he's been cranky, not himself.
Doctor: Any discharge from the ear? Trouble hearing?
Parent: No discharge. But honestly, for a few weeks now the daycare teacher says he doesn't always respond when called, and he's been turning the TV up loud.
Doctor: That's helpful to know. Any cough or runny nose?
Parent: A runny nose for about a week. Clear, then greenish.
Doctor: Does he attend daycare? Anyone smoke at home?
Parent: Daycare five days a week. No smoking.
Doctor: Let me have a look. Sam, can I peek in your ear? There we go. The right eardrum is red and bulging with fluid behind it. The left one has some fluid too but looks less angry. Throat is a little red, no white patches. Chest is clear, temperature here is 38.1.
Parent: So another infection.
Doctor: Yes — acute otitis media on the right. Given it's his third since October, the pain, and the fever, I'll treat with antibiotics: amoxicillin, 90 milligrams per kilogram per day split into two doses, for ten days. Keep up paracetamol for pain and fever as needed.
Parent: And the hearing thing?
Doctor: That's the part I don't want to lose track of. Persistent fluid between infections can muffle hearing, and at his age that matters for speech. Three infections in a season plus the hearing concerns means I'd like an ear, nose and throat specialist to assess him — they'll consider whether ventilation tubes are worth discussing, and we'll arrange a hearing test.
Parent: Okay, that makes sense.
Doctor: Come back in two weeks so I can recheck both ears, or sooner if he's not improving in 48 to 72 hours on the antibiotic, if the fever climbs, or if you see discharge.`,
  },
];
