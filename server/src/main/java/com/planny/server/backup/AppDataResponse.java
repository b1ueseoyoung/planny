package com.planny.server.backup;

import com.planny.server.ledger.TransactionResponse;
import com.planny.server.schedule.EventResponse;
import java.util.List;

/** types.ts의 AppData와 같은 모양. id는 서버 id다 */
record AppDataResponse(
        String userName,
        long budget,
        List<TransactionResponse> transactions,
        List<EventResponse> events) {
}
