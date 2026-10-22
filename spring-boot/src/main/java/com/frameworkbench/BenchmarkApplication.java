package com.frameworkbench;

import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.Bean;
import tools.jackson.module.blackbird.BlackbirdModule;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.stream.IntStream;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class BenchmarkApplication {
    public static void main(String[] args) {
        SpringApplication.run(BenchmarkApplication.class, args);
    }

    @Bean
    BlackbirdModule blackbirdModule() {
        return new BlackbirdModule();
    }

    @GetMapping(value = "/health", produces = "text/plain;charset=UTF-8")
    public String health() {
        return "OK";
    }

    @GetMapping(value = "/plaintext", produces = "text/plain;charset=UTF-8")
    public String plaintext() {
        return "Hello, World!";
    }

    @GetMapping(value = "/json", produces = MediaType.APPLICATION_JSON_VALUE)
    public Message json() {
        return new Message("Hello, World!");
    }

    @GetMapping(value = "/json-large", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<Item> jsonLarge() {
        return IntStream.rangeClosed(1, 100)
                .mapToObj(id -> new Item(id, "item-" + id, id * 10)).toList();
    }

    @PostMapping(value = "/aggregate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AggregateResult aggregate(@RequestBody AggregateInput input) {
        long sum = input.numbers().stream().mapToLong(Integer::longValue).sum();
        int min = input.numbers().stream().mapToInt(Integer::intValue).min().orElse(0);
        int max = input.numbers().stream().mapToInt(Integer::intValue).max().orElse(0);
        return new AggregateResult(input.numbers().size(), sum, min, max);
    }

    public record Message(String message) {}
    public record Item(int id, String name, int value) {}
    public record AggregateInput(List<Integer> numbers) {}
    public record AggregateResult(int count, long sum, int min, int max) {}
}
