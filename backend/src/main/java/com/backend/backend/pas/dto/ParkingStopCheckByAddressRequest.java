package com.backend.backend.pas.dto;

public class ParkingStopCheckByAddressRequest {
    private String ctprvnNm;
    private String signguNm;
    private String rdnmadr;

    public String getCtprvnNm() {
        return ctprvnNm;
    }

    public void setCtprvnNm(String ctprvnNm) {
        this.ctprvnNm = ctprvnNm;
    }

    public String getSignguNm() {
        return signguNm;
    }

    public void setSignguNm(String signguNm) {
        this.signguNm = signguNm;
    }

    public String getRdnmadr() {
        return rdnmadr;
    }

    public void setRdnmadr(String rdnmadr) {
        this.rdnmadr = rdnmadr;
    }
}
