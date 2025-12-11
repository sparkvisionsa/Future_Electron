import asyncio, traceback

from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from .formSteps import form_steps
from .formFiller import fill_form
from .macroFiller import handle_macro_edits
from .createMacros import run_create_assets

MONGO_URI = "mongodb+srv://Aasim:userAasim123@electron.cwbi8id.mongodb.net"
client = AsyncIOMotorClient(MONGO_URI)
db = client["test"]


async def navigate_to_existing_report_assets(browser, report_id):
    asset_creation_url = f"https://qima.taqeem.sa/report/asset/create/{report_id}"

    main_page = await browser.get(asset_creation_url)
    await asyncio.sleep(2)

    current_url = await main_page.evaluate("window.location.href")
    if str(report_id) not in current_url:
        return None

    return main_page

async def create_report_for_record(browser, record, tabs_num=3):
    try:
        if not record or "_id" not in record:
            return {"status": "FAILED", "error": "Invalid record object (missing _id)"}

        # Mark start time
        await db.multiapproachreports.update_one(
            {"_id": record["_id"]},
            {"$set": {"startSubmitTime": datetime.now(timezone.utc)}}
        )

        results = []
        record["number_of_macros"] = str(len(record.get("asset_data", [])))

        # Open the initial create-report page
        main_page = await browser.get("https://qima.taqeem.sa/report/create/4/487")
        await asyncio.sleep(1)

        for step_num, step_config in enumerate(form_steps, 1):
            is_last = step_num == len(form_steps)

            results.append({
                "status": "STEP_STARTED",
                "step": step_num,
                "recordId": str(record["_id"])
            })

            if step_num == 2 and len(record.get("asset_data", [])) > 10:
                # NOTE: assuming run_create_assets signature accepts (browser, record, tabs_num, batch_size)
                result = await run_create_assets(
                    browser,
                    record,
                    tabs_num=tabs_num,
                    batch_size=10
                )
            else:
                result = await fill_form(
                    main_page,
                    record,
                    step_config["field_map"],
                    step_config["field_types"],
                    is_last,
                )

            if isinstance(result, dict) and result.get("status") == "FAILED":
                results.append({
                    "status": "FAILED",
                    "step": step_num,
                    "recordId": str(record["_id"]),
                    "error": result.get("error")
                })

                # Mark end time even on failure
                await db.multiapproachreports.update_one(
                    {"_id": record["_id"]},
                    {"$set": {"endSubmitTime": datetime.now(timezone.utc)}}
                )
                return {"status": "FAILED", "results": results}

            if is_last:
                main_url = await main_page.evaluate("window.location.href")
                form_id = main_url.split("/")[-1]
                if not form_id:
                    results.append({
                        "status": "FAILED",
                        "step": "report_id",
                        "recordId": str(record["_id"]),
                        "error": "Could not determine report_id"
                    })

                    await db.multiapproachreports.update_one(
                        {"_id": record["_id"]},
                        {"$set": {"endSubmitTime": datetime.now(timezone.utc)}}
                    )
                    return {"status": "FAILED", "results": results}

                # Save report_id on document
                await db.multiapproachreports.update_one(
                    {"_id": record["_id"]},
                    {"$set": {"report_id": form_id}}
                )
                record["report_id"] = form_id

                # Handle macro edits
                macro_result = await handle_macro_edits(browser, record, tabs_num=tabs_num)
                if isinstance(macro_result, dict) and macro_result.get("status") == "FAILED":
                    results.append({
                        "status": "FAILED",
                        "step": "macro_edit",
                        "recordId": str(record["_id"]),
                        "error": macro_result.get("error")
                    })

                    await db.multiapproachreports.update_one(
                        {"_id": record["_id"]},
                        {"$set": {"endSubmitTime": datetime.now(timezone.utc)}}
                    )
                    return {"status": "FAILED", "results": results}

                results.append({
                    "status": "MACRO_EDIT_SUCCESS",
                    "message": "All macros filled",
                    "recordId": str(record["_id"])
                })

        # Mark successful end time
        await db.multiapproachreports.update_one(
            {"_id": record["_id"]},
            {"$set": {"endSubmitTime": datetime.now(timezone.utc)}}
        )

        return {"status": "SUCCESS", "results": results}

    except Exception as e:
        tb = traceback.format_exc()
        # Mark end time even on unexpected exception
        await db.multiapproachreports.update_one(
            {"_id": record["_id"]},
            {"$set": {"endSubmitTime": datetime.now(timezone.utc)}}
        )
        return {"status": "FAILED", "error": str(e), "traceback": tb}



async def create_new_report(browser, record_id, tabs_num=3):
    try:
        if not ObjectId.is_valid(record_id):
            return {"status": "FAILED", "error": "Invalid record_id"}

        record = await db.multiapproachreports.find_one({"_id": ObjectId(record_id)})
        if not record:
            return {"status": "FAILED", "error": "Record not found"}

        return await create_report_for_record(browser, record, tabs_num=tabs_num)

    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "traceback": traceback.format_exc()
        }


async def create_reports_by_batch(browser, batch_id, tabs_num=3):
    try:
        if not batch_id:
            return {"status": "FAILED", "error": "Missing batch_id"}

        cursor = db.multiapproachreports.find({"batchId": batch_id})
        records = await cursor.to_list(length=None)

        if not records:
            return {
                "status": "FAILED",
                "error": f"No records found for batch_id: {batch_id}"
            }

        batch_start = datetime.now(timezone.utc)

        batch_results = {
            "batch_id": batch_id,
            "startTime": batch_start,
            "totalRecords": len(records),
            "successCount": 0,
            "failureCount": 0,
            "records": []
        }

        for record in records:
            record_id_str = str(record["_id"])
            try:
                result = await create_report_for_record(
                    browser=browser,
                    record=record,
                    tabs_num=tabs_num
                )

                if result.get("status") == "SUCCESS":
                    batch_results["successCount"] += 1
                else:
                    batch_results["failureCount"] += 1

                batch_results["records"].append({
                    "recordId": record_id_str,
                    "result": result
                })

            except Exception as record_err:
                batch_results["failureCount"] += 1
                batch_results["records"].append({
                    "recordId": record_id_str,
                    "status": "FAILED",
                    "error": str(record_err),
                    "traceback": traceback.format_exc()
                })

        batch_results["endTime"] = datetime.now(timezone.utc)
        batch_results["status"] = (
            "SUCCESS"
            if batch_results["failureCount"] == 0
            else "PARTIAL_SUCCESS"
        )

        return batch_results

    except Exception as e:
        return {
            "status": "FAILED",
            "batch_id": batch_id,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
