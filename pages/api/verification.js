import middleware from '../../middleware/middleware'
import nextConnect from 'next-connect'
import fs from 'fs'
import { verifySignature } from "@govtechsg/open-attestation";

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
      // console.log(oajson);
      if (verifySignature(oajson)) {
        res.redirect('/success')
      } else {
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
