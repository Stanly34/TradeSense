import { scanAllPropFirms } from '../services/promoScanner.js'

async function main() {
  try {
    const results = await scanAllPropFirms()
    console.log(JSON.stringify(results))
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()