package com.backend.backend.board.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {
    @GetMapping("/test")
    public String test() {
        return "?ㅽ봽留??쒕쾭媛 ?꾩＜ ???뚯븘媛怨??덉뼱?? DB ?곌껐???깃났!";
    }
}