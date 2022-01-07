import middleware from '../../middleware/middleware'
import nextConnect from 'next-connect'
import fs from 'fs'
import { isValid, verify } from "@govtechsg/oa-verify";
import { getData } from "@govtechsg/open-attestation";

function validateJSON(body) {
  try {
    var data = JSON.parse(body);
    // if came to here, then valid
    return data;
  } catch (e) {
    // failed to parse
    return null;
  }
}

function getAge(dateString) {
  var today = new Date();
  var birthDate = new Date(dateString);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function getDayDifference(dateString) {
  var today = new Date();
  var date = new Date(dateString);
  var difference_in_time = today.getTime() - date.getTime();
  return Math.round(difference_in_time / (1000 * 3600 * 24) - 1);
}

const handler = nextConnect()
handler.use(middleware)

handler.post(async (req, res) => {
  if (req.files.cert[0].path == undefined) {
    // File does not exist.
    res.redirect('/nofile')

  } else {
    // File exists.

    let rawfiledata = fs.readFileSync(req.files.cert[0].path);
    let oajson = JSON.parse(rawfiledata);

    const fragments = await verify(oajson);

    // To verify OA document is not tampered
    if (isValid(fragments, ["DOCUMENT_INTEGRITY"]) && isValid(fragments, ["DOCUMENT_STATUS"]) && isValid(fragments, ["ISSUER_IDENTITY"])) {

      // Get unwrapped OA JSON
      const data = getData(oajson);

      // Extract vaccination records and date of birth
      let vaccinationCount = []
      let dob
      data.fhirBundle.entry.forEach(function (element) {
        switch (element.resourceType) {
          case "Immunization":
            vaccinationCount.push(element)
            break;
          case "Patient":
            dob = element.birthDate
            break;
          default:
            console.log(`Sorry, we are out of ${expr}.`);
        }
      });

      // Checking logic
      if (getAge(dob) >= 18) {
        console.log("Age is more than 18")
        if (vaccinationCount.length > 2) {
          console.log("More than 2 doses")
          console.log("Fully vaccinated")
          res.redirect('/success')
        } else {
          console.log("2 doses")
          let day_last_date_primary_series = 9999
          vaccinationCount.forEach(function (dose) {
            if (getDayDifference(dose.occurrenceDateTime) < day_last_date_primary_series) {
              day_last_date_primary_series = getDayDifference(dose.occurrenceDateTime)
            }
          });
          console.log("Number of days from last dose - " + day_last_date_primary_series)
          if (day_last_date_primary_series > 270) {
            console.log("Not fully vaccinated")
            res.redirect('/failed')
          } else {
            console.log("Fully vaccinated")
            res.redirect('/success')
          }
        }
      } else {
        console.log("Age is lesser than 18")
        res.redirect('/failed')
      }
    } else {
      console.log("Doc verification failed")
      res.redirect('/failed')
    }
  }

})

export const config = {
  api: {
    bodyParser: false
  }
}

export default handler
